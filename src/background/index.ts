import type { TreeNode } from "../types";
import {
  getAllNodes,
  saveNode,
  getNodeByChatUrl,
  deleteNode,
  updateNodeName,
} from "../storage/db";

type Platform = "chatgpt" | "gemini";

const ALL_URLS = [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "https://gemini.google.com/*",
];

function detectPlatformFromUrl(url: string): Platform {
  if (url.includes("gemini.google.com")) return "gemini";
  return "chatgpt";
}

function isHomepage(url: string, platform: Platform): boolean {
  if (platform === "gemini") {
    return url === "https://gemini.google.com/app" || url === "https://gemini.google.com/app/";
  }
  return url === "https://chatgpt.com/" || url === "https://chat.openai.com/";
}

function isChatUrl(url: string, platform: Platform): boolean {
  if (platform === "gemini") {
    // Gemini chat URLs look like gemini.google.com/app/<id>
    return url.includes("/app/") && !url.endsWith("/app") && !url.endsWith("/app/");
  }
  return url.includes("/c/");
}

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// Track the active URL
let activeUrl = "";

// Pending branch tracking
async function getPendingBranch(tabId: number): Promise<string | null> {
  const result = await chrome.storage.session.get(`pending_${tabId}`);
  return result[`pending_${tabId}`] || null;
}

async function setPendingBranch(tabId: number, nodeId: string): Promise<void> {
  await chrome.storage.session.set({ [`pending_${tabId}`]: nodeId });
}

async function clearPendingBranch(tabId: number): Promise<void> {
  await chrome.storage.session.remove(`pending_${tabId}`);
}

// Handle messages
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  handleMessage(message, sender).then((response) => {
    sendResponse(response);
  }).catch((err) => {
    sendResponse({ ok: false, error: err.message });
  });
  return true;
});

async function handleMessage(message: any, sender: chrome.runtime.MessageSender) {
  switch (message.type) {
    case "BRANCH_FROM_SELECTION":
      return handleBranch(message, sender);

    case "GET_TREE":
      return getAllNodes();

    case "GET_ACTIVE_URL":
      return { url: activeUrl };

    case "RENAME_NODE":
      await updateNodeName(message.payload.nodeId, message.payload.newName);
      notifySidepanel();
      return { ok: true };

    case "DELETE_NODE":
      await deleteNode(message.payload.nodeId);
      notifySidepanel();
      return { ok: true };

    case "NAVIGATE_TO_CHAT": {
      const targetUrl = message.payload.chatUrl;
      const platform = detectPlatformFromUrl(targetUrl);

      // Find a tab on the same platform
      const urlPatterns = platform === "gemini"
        ? ["https://gemini.google.com/*"]
        : ["https://chatgpt.com/*", "https://chat.openai.com/*"];

      const tabs = await chrome.tabs.query({ url: urlPatterns });
      if (tabs[0]?.id) {
        await chrome.tabs.update(tabs[0].id, { url: targetUrl, active: true });
      } else {
        // No tab open on that platform — create one
        await chrome.tabs.create({ url: targetUrl });
      }
      return { ok: true };
    }

    case "CURRENT_CHAT_URL": {
      const url = message.payload.url;
      const platform: Platform = message.payload.platform || detectPlatformFromUrl(url);
      activeUrl = url;

      chrome.runtime.sendMessage({
        type: "ACTIVE_URL_CHANGED",
        payload: { url },
      }).catch(() => {});

      // Capture URL for pending branches
      const tabId = sender.tab?.id;
      if (tabId) {
        const nodeId = await getPendingBranch(tabId);
        if (nodeId) {
          if (url && !isHomepage(url, platform) && isChatUrl(url, platform)) {
            const nodes = await getAllNodes();
            const node = nodes.find((n) => n.id === nodeId);
            if (node) {
              node.chatUrl = url;
              await saveNode(node);
              notifySidepanel();
            }
            await clearPendingBranch(tabId);
          }
        }
      }
      return { ok: true };
    }

    default:
      return { ok: false, error: "Unknown message type" };
  }
}

async function handleBranch(
  message: any,
  sender: chrome.runtime.MessageSender
) {
  const { selectedText, conversationMessages, chatUrl, question } = message.payload;
  const tabId = sender.tab?.id;
  const platform = detectPlatformFromUrl(chatUrl);

  if (!tabId) {
    sendErrorToTab(tabId, "Could not identify the browser tab.");
    return { ok: false, error: "No tab" };
  }

  try {
    let sourceNode = await getNodeByChatUrl(chatUrl);
    if (!sourceNode) {
      sourceNode = {
        id: crypto.randomUUID(),
        name: "Root conversation",
        chatUrl,
        parentId: null,
        selectedText: "",
        contextMessages: conversationMessages,
        platform,
        createdAt: Date.now(),
        children: [],
      };
      await saveNode(sourceNode);
    }

    const fullPrompt = buildContextPrompt(conversationMessages, selectedText, question);

    const newNode: TreeNode = {
      id: crypto.randomUUID(),
      name: question.length > 80 ? question.slice(0, 80) + "..." : question,
      chatUrl: "",
      parentId: sourceNode.id,
      selectedText,
      contextMessages: conversationMessages,
      platform,
      createdAt: Date.now(),
      children: [],
    };

    sourceNode.children.push(newNode.id);
    await saveNode(sourceNode);
    await saveNode(newNode);

    await setPendingBranch(tabId, newNode.id);

    // Click "New Chat"
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async () => {
        await (window as any).__deepdive.clickNewChat();
      },
    });

    await sleep(1500);

    // Type and send the prompt
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (prompt: string) => {
        await (window as any).__deepdive.typeAndSend(prompt);
      },
      args: [fullPrompt],
    });

    notifySidepanel();
    return { ok: true, nodeId: newNode.id };
  } catch (err: any) {
    sendErrorToTab(tabId, `Branch failed: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

function sendErrorToTab(tabId: number | undefined, error: string) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, {
    type: "BRANCH_ERROR",
    payload: { error },
  }).catch(() => {});
}

function buildContextPrompt(
  messages: Array<{ role: string; content: string }>,
  selectedText: string,
  question: string
): string {
  const maxContextLength = 6000;
  let contextStr = "";
  const relevantMessages = [...messages].reverse();

  for (const msg of relevantMessages) {
    const line = `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}\n\n`;
    if (contextStr.length + line.length > maxContextLength) break;
    contextStr = line + contextStr;
  }

  return `I was reading a conversation and have a question about a specific part. Here's the relevant context:

---
${contextStr.trim()}
---

The part I'm asking about:
"${selectedText}"

My question: ${question}`;
}

function notifySidepanel() {
  chrome.runtime.sendMessage({ type: "TREE_UPDATED" }).catch(() => {});
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import { getSelectors, getPlatform } from "./selectors";

/**
 * Clicks the "New chat" button.
 */
export async function clickNewChat(): Promise<void> {
  const selectors = getSelectors();
  const btn = document.querySelector(selectors.newChatButton) as HTMLElement;
  if (!btn) {
    // Fallback: navigate directly to homepage
    window.location.href = selectors.homepageUrl;
    await sleep(1000);
    return;
  }
  btn.click();
  await waitForNavigation();
}

/**
 * Types a message into the prompt and sends it.
 */
export async function typeAndSend(text: string): Promise<void> {
  const selectors = getSelectors();
  const platform = getPlatform();

  const textarea = await waitForElement<HTMLElement>(selectors.promptTextarea);
  if (!textarea) {
    console.error("[DeepDive] Could not find prompt textarea");
    return;
  }

  textarea.focus();

  if (platform === "gemini") {
    // Gemini uses Quill editor — set innerHTML and dispatch input event
    textarea.innerHTML = `<p>${escapeHtml(text)}</p>`;
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  } else {
    // ChatGPT uses ProseMirror — use clipboard paste
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", text);
    const pasteEvent = new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: clipboardData,
    });
    textarea.dispatchEvent(pasteEvent);
  }

  await sleep(300);

  // Click send
  const sendBtn = await waitForElement<HTMLElement>(selectors.sendButton);
  if (sendBtn) {
    await sleep(200);
    sendBtn.click();
  }
}

/**
 * Scrapes all conversation messages from the current chat.
 */
export function scrapeConversation(): Array<{
  role: "user" | "assistant";
  content: string;
}> {
  const selectors = getSelectors();
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  const blocks = document.querySelectorAll(selectors.messageBlock);

  blocks.forEach((block) => {
    const role = selectors.getRoleFromBlock(block);
    if (role) {
      const content = selectors.getMessageText(block);
      if (content) {
        messages.push({ role, content });
      }
    }
  });

  return messages;
}

// --- Utilities ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "</p><p>");
}

async function waitForElement<T extends Element>(
  selector: string,
  timeout = 5000
): Promise<T | null> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector<T>(selector);
    if (el) return el;
    await sleep(100);
  }
  console.warn(`[DeepDive] Timeout waiting for element: ${selector}`);
  return null;
}

async function waitForNavigation(timeout = 3000): Promise<void> {
  return new Promise((resolve) => {
    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const originalUrl = window.location.href;
    const interval = setInterval(() => {
      if (window.location.href !== originalUrl) {
        clearInterval(interval);
        setTimeout(done, 500);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      done();
    }, timeout);
  });
}

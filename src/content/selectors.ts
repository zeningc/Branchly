// Platform-specific DOM selectors.
// Centralized here so they're easy to update when sites change their UI.

export type Platform = "chatgpt" | "gemini";

export function detectPlatform(): Platform {
  const host = window.location.hostname;
  if (host.includes("gemini.google.com")) return "gemini";
  return "chatgpt";
}

interface PlatformSelectors {
  // Individual message blocks (each turn in the conversation)
  messageBlock: string;
  // Attribute or method to determine message role
  getRoleFromBlock: (el: Element) => "user" | "assistant" | null;
  // The text input area
  promptTextarea: string;
  // The send button
  sendButton: string;
  // New chat button
  newChatButton: string;
  // The homepage URL (used to detect "no chat selected" state)
  homepageUrl: string;
  // Pattern to detect a real chat URL (vs homepage)
  isChatUrl: (url: string) => boolean;
  // How to get text content from a message block
  getMessageText: (el: Element) => string;
  // CSS selector string for closest() lookups on message blocks
  messageBlockSelector: string;
  // Whether to check for a parent message container when selecting text
  isMessageElement: (el: Element) => boolean;
}

const chatgptSelectors: PlatformSelectors = {
  messageBlock: "[data-message-author-role]",
  getRoleFromBlock: (el) => {
    const role = el.getAttribute("data-message-author-role");
    if (role === "user" || role === "assistant") return role;
    return null;
  },
  promptTextarea: "#prompt-textarea",
  sendButton: '[data-testid="send-button"]',
  newChatButton: '[data-testid="create-new-chat-button"]',
  homepageUrl: "https://chatgpt.com/",
  isChatUrl: (url) => url.includes("/c/"),
  getMessageText: (el) => el.textContent?.trim() || "",
  messageBlockSelector: "[data-message-author-role]",
  isMessageElement: (el) => {
    // Check the element itself or any ancestor
    if (el.getAttribute?.("data-message-author-role")) return true;
    if (el.closest?.("[data-message-author-role]")) return true;
    return false;
  },
};

const geminiSelectors: PlatformSelectors = {
  // Gemini uses custom web components
  messageBlock: "message-content",
  getRoleFromBlock: (el) => {
    // Gemini message-content elements have a `data-message-id` and the role
    // is determined by the parent turn container
    const turn = el.closest(".conversation-turn");
    if (turn?.classList.contains("model-turn") || turn?.querySelector("model-response")) {
      return "assistant";
    }
    if (turn?.classList.contains("user-turn") || turn?.querySelector("user-query")) {
      return "user";
    }
    // Fallback: check the element's own attributes
    const modelResponse = el.closest("model-response");
    if (modelResponse) return "assistant";
    const userQuery = el.closest("user-query");
    if (userQuery) return "user";
    return null;
  },
  promptTextarea: ".ql-editor",
  sendButton: 'button.send-button, button[aria-label="Send message"]',
  newChatButton: 'a[aria-label="New chat"], button[aria-label="New chat"]',
  homepageUrl: "https://gemini.google.com/app",
  isChatUrl: (url) => url.includes("/app/") && !url.endsWith("/app") && !url.endsWith("/app/"),
  getMessageText: (el) => el.textContent?.trim() || "",
  messageBlockSelector: "message-content, model-response, user-query, .conversation-turn",
  isMessageElement: (el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag === "message-content") return true;
    if (el.closest?.("message-content")) return true;
    if (el.closest?.("model-response")) return true;
    if (el.closest?.("user-query")) return true;
    if (el.closest?.(".conversation-turn")) return true;
    return false;
  },
};

let cachedPlatform: Platform | null = null;
let cachedSelectors: PlatformSelectors | null = null;

export function getPlatform(): Platform {
  if (!cachedPlatform) {
    cachedPlatform = detectPlatform();
  }
  return cachedPlatform;
}

export function getSelectors(): PlatformSelectors {
  if (!cachedSelectors) {
    cachedSelectors = getPlatform() === "gemini" ? geminiSelectors : chatgptSelectors;
  }
  return cachedSelectors;
}

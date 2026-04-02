import { initSelectionHandler } from "./selectionHandler";
import { clickNewChat, typeAndSend } from "./chatActions";
import { getPlatform } from "./selectors";
import { showToast } from "./toast";

const platform = getPlatform();
console.log(`[DeepDive] Content script loaded on ${platform}`);

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (message: any, _sender, sendResponse) => {
    switch (message.type) {
      case "NAVIGATE_TO_CHAT":
        window.location.href = message.payload.chatUrl;
        sendResponse({ ok: true });
        break;

      case "CURRENT_CHAT_URL":
        sendResponse({ url: window.location.href });
        break;

      case "BRANCH_ERROR":
        showToast(message.payload.error, "error");
        sendResponse({ ok: true });
        break;
    }
    return true;
  }
);

// Expose functions for the background script to call via executeScript
(window as any).__deepdive = {
  clickNewChat,
  typeAndSend,
  platform,
};

// Wait for body to be available before setting up DOM-dependent features
function init() {
  initSelectionHandler();

  // Notify background script of URL changes (both ChatGPT and Gemini use client-side routing)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      chrome.runtime.sendMessage({
        type: "CURRENT_CHAT_URL",
        payload: { url: lastUrl, platform },
      }).catch(() => {});
    }
  });

  urlObserver.observe(document.body, { childList: true, subtree: true });

  // Send initial URL
  chrome.runtime.sendMessage({
    type: "CURRENT_CHAT_URL",
    payload: { url: window.location.href, platform },
  }).catch(() => {});
}

if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}

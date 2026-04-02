import { scrapeConversation } from "./chatActions";
import { getSelectors } from "./selectors";
import { showToast } from "./toast";
import type { Message } from "../types";

let floatingUI: HTMLElement | null = null;

/**
 * Initializes the text selection handler.
 * When the user selects text on ChatGPT, a floating "Branch" button appears.
 * Clicking it expands into a question input — user types their question,
 * then we open a new chat with context + question all at once.
 */
export function initSelectionHandler() {
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("mousedown", onMouseDown);
}

function onMouseDown(e: MouseEvent) {
  if (floatingUI && !floatingUI.contains(e.target as Node)) {
    removeFloatingUI();
  }
}

function onMouseUp(e: MouseEvent) {
  if (floatingUI?.contains(e.target as Node)) return;

  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();

  if (!selectedText || selectedText.length < 10) {
    return;
  }

  // Check if the selection is within a chat message
  const anchorNode = selection?.anchorNode;
  const messageContainer = anchorNode
    ? findParentMessage(anchorNode as HTMLElement)
    : null;
  if (!messageContainer) return;

  showBranchButton(e.clientX, e.clientY, selectedText);
}

function findParentMessage(node: HTMLElement): HTMLElement | null {
  const selectors = getSelectors();

  // First try: walk up looking for a message element directly
  let current: HTMLElement | null = node;
  while (current) {
    if (selectors.isMessageElement(current)) {
      return current;
    }
    current = current.parentElement;
  }

  // Second try: use closest() to find a message block ancestor
  // This handles cases where the text node is deeply nested
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  if (el) {
    const block = el.closest?.(selectors.messageBlockSelector);
    if (block) return block as HTMLElement;
  }

  // Third try: check if we're anywhere inside the main chat area
  // This is a broad fallback — if the user selected text in the conversation, allow it
  if (el?.closest?.("main, .conversation-container")) {
    return el;
  }

  return null;
}

function showBranchButton(x: number, y: number, selectedText: string) {
  removeFloatingUI();

  floatingUI = document.createElement("div");
  floatingUI.id = "deepdive-floating-ui";
  Object.assign(floatingUI.style, {
    position: "fixed",
    left: `${Math.min(x + 10, window.innerWidth - 360)}px`,
    top: `${Math.min(y - 40, window.innerHeight - 60)}px`,
    zIndex: "10000",
  });

  // Start with just the branch button
  renderBranchButton(floatingUI, selectedText, x, y);
  document.body.appendChild(floatingUI);
}

function renderBranchButton(
  container: HTMLElement,
  selectedText: string,
  x: number,
  y: number
) {
  container.innerHTML = `
    <button id="deepdive-branch-trigger" style="
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      transition: background 0.15s;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="6" y1="3" x2="6" y2="15"></line>
        <circle cx="18" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <path d="M18 9a9 9 0 0 1-9 9"></path>
      </svg>
      Branch
    </button>
  `;

  container.querySelector("#deepdive-branch-trigger")!.addEventListener("click", () => {
    expandToQuestionInput(container, selectedText, x, y);
  });
}

function expandToQuestionInput(
  container: HTMLElement,
  selectedText: string,
  _x: number,
  y: number
) {
  // Reposition to make room for the expanded input
  const top = Math.min(y - 20, window.innerHeight - 200);
  container.style.top = `${top}px`;

  container.innerHTML = `
    <div style="
      background: #1e1e2e;
      border: 1px solid #6366f1;
      border-radius: 12px;
      padding: 12px;
      width: 340px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
        color: #a5b4fc;
        font-size: 12px;
        font-weight: 600;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="6" y1="3" x2="6" y2="15"></line>
          <circle cx="18" cy="6" r="3"></circle>
          <circle cx="6" cy="18" r="3"></circle>
          <path d="M18 9a9 9 0 0 1-9 9"></path>
        </svg>
        DeepDive Branch
      </div>
      <div style="
        background: #2a2a3e;
        border-radius: 6px;
        padding: 6px 10px;
        margin-bottom: 10px;
        font-size: 12px;
        color: #9ca3af;
        max-height: 60px;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.4;
      ">
        "${selectedText.length > 120 ? selectedText.slice(0, 120) + "..." : selectedText}"
      </div>
      <textarea id="deepdive-question-input" placeholder="What's your question about this?" style="
        width: 100%;
        background: #2a2a3e;
        border: 1px solid #3a3a5e;
        border-radius: 8px;
        padding: 8px 10px;
        color: #e0e0e0;
        font-size: 13px;
        font-family: inherit;
        resize: none;
        outline: none;
        min-height: 60px;
        line-height: 1.4;
      "></textarea>
      <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
        <button id="deepdive-cancel-btn" style="
          background: transparent;
          border: 1px solid #3a3a5e;
          color: #9ca3af;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 12px;
          cursor: pointer;
        ">Cancel</button>
        <button id="deepdive-submit-btn" style="
          background: #6366f1;
          border: none;
          color: white;
          border-radius: 6px;
          padding: 6px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        ">Ask in new thread</button>
      </div>
    </div>
  `;

  const input = container.querySelector("#deepdive-question-input") as HTMLTextAreaElement;
  input.focus();

  // Submit on Enter (without Shift)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitBranch(selectedText, input.value.trim());
    }
  });

  container.querySelector("#deepdive-cancel-btn")!.addEventListener("click", () => {
    removeFloatingUI();
  });

  container.querySelector("#deepdive-submit-btn")!.addEventListener("click", () => {
    submitBranch(selectedText, input.value.trim());
  });
}

function submitBranch(selectedText: string, question: string) {
  if (!question) return;

  const conversationMessages = scrapeConversation();
  const currentUrl = window.location.href;

  const message: Message = {
    type: "BRANCH_FROM_SELECTION",
    payload: {
      selectedText,
      conversationMessages,
      sourceNodeId: null,
      chatUrl: currentUrl,
      question,
    },
  };

  chrome.runtime.sendMessage(message, (response) => {
    if (response?.ok) {
      showToast("Branch created! Opening new thread...", "success");
    } else if (response?.error) {
      showToast(`Failed to branch: ${response.error}`, "error");
    }
  });
  removeFloatingUI();
}

function removeFloatingUI() {
  if (floatingUI) {
    floatingUI.remove();
    floatingUI = null;
  }
}

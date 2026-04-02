export interface TreeNode {
  id: string;
  name: string;
  chatUrl: string;
  parentId: string | null;
  selectedText: string;
  contextMessages: ConversationMessage[];
  platform: "chatgpt" | "gemini";
  createdAt: number;
  children: string[]; // child node IDs
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// Messages between content script <-> background <-> sidepanel
export type Message =
  | {
      type: "BRANCH_FROM_SELECTION";
      payload: {
        selectedText: string;
        conversationMessages: ConversationMessage[];
        sourceNodeId: string | null;
        chatUrl: string;
        question: string;
      };
    }
  | {
      type: "NAVIGATE_TO_CHAT";
      payload: { chatUrl: string };
    }
  | {
      type: "TREE_UPDATED";
    }
  | {
      type: "GET_TREE";
    }
  | {
      type: "RENAME_NODE";
      payload: { nodeId: string; newName: string };
    }
  | {
      type: "DELETE_NODE";
      payload: { nodeId: string };
    }
  | {
      type: "CURRENT_CHAT_URL";
      payload: { url: string };
    }
  | {
      type: "ACTIVE_URL_CHANGED";
      payload: { url: string };
    }
  | {
      type: "GET_ACTIVE_URL";
    }
  | {
      type: "BRANCH_ERROR";
      payload: { error: string };
    };

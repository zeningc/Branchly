import { useState, useEffect, useCallback, createContext, useContext } from "react";
import type { TreeNode } from "../types";
import { TreeView } from "./TreeView";
import { darkTheme, lightTheme, type Theme } from "./theme";

// Theme context
const ThemeContext = createContext<Theme>(darkTheme);
export const useTheme = () => useContext(ThemeContext);

export function App() {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeUrl, setActiveUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDark, setIsDark] = useState(() => {
    // Persist theme preference
    const saved = localStorage.getItem("deepdive-theme");
    return saved !== "light";
  });

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("deepdive-theme", next ? "dark" : "light");
      return next;
    });
  };

  const loadTree = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_TREE" });
      if (Array.isArray(response)) {
        setNodes(response);
      }
    } catch {
      // Extension context may be invalidated
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadTree();

    // Get initial active URL
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_URL" }).then((res) => {
      if (res?.url) setActiveUrl(res.url);
    }).catch(() => {});

    const listener = (message: any) => {
      if (message.type === "TREE_UPDATED") {
        loadTree();
      } else if (message.type === "ACTIVE_URL_CHANGED") {
        setActiveUrl(message.payload.url);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [loadTree]);

  const handleNavigate = (chatUrl: string) => {
    chrome.runtime.sendMessage({
      type: "NAVIGATE_TO_CHAT",
      payload: { chatUrl },
    });
  };

  const handleRename = async (nodeId: string, newName: string) => {
    await chrome.runtime.sendMessage({
      type: "RENAME_NODE",
      payload: { nodeId, newName },
    });
    loadTree();
  };

  const handleDelete = async (nodeId: string) => {
    await chrome.runtime.sendMessage({
      type: "DELETE_NODE",
      payload: { nodeId },
    });
    loadTree();
  };

  const rootNodes = nodes.filter((n) => n.parentId === null);

  // Filter nodes by search query
  const matchingNodeIds = new Set<string>();
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    // Find all nodes matching the query
    for (const node of nodes) {
      if (node.name.toLowerCase().includes(q) || node.selectedText.toLowerCase().includes(q)) {
        // Add this node and all ancestors to the matching set
        let current: TreeNode | undefined = node;
        while (current) {
          matchingNodeIds.add(current.id);
          current = current.parentId
            ? nodes.find((n) => n.id === current!.parentId)
            : undefined;
        }
      }
    }
  }

  const isSearching = searchQuery.trim().length > 0;

  return (
    <ThemeContext.Provider value={theme}>
      <div style={{ ...styles.container, background: theme.bg, color: theme.text }}>
        {/* Header */}
        <div style={{ ...styles.header, borderBottom: `1px solid ${theme.border}` }}>
          <h1 style={{ ...styles.title, color: theme.text }}>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={theme.accent} strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ marginRight: 8 }}
            >
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            DeepDive
          </h1>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              padding: "4px",
              borderRadius: 6,
              lineHeight: 1,
            }}
          >
            {isDark ? "\u2600\uFE0F" : "\uD83C\uDF19"}
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: "8px 12px", borderBottom: `1px solid ${theme.border}` }}>
          <div style={{ position: "relative" }}>
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={theme.textMuted} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: theme.inputBg,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 8,
                padding: "7px 10px 7px 32px",
                color: theme.text,
                fontSize: 13,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: theme.textMuted,
                  cursor: "pointer",
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                \u2715
              </button>
            )}
          </div>
          {isSearching && (
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, paddingLeft: 2 }}>
              {matchingNodeIds.size === 0
                ? "No results"
                : `${nodes.filter((n) => matchingNodeIds.has(n.id) && n.name.toLowerCase().includes(searchQuery.toLowerCase())).length} match${nodes.filter((n) => matchingNodeIds.has(n.id) && n.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 1 ? "" : "es"}`}
            </div>
          )}
        </div>

        {/* Tree */}
        {loading ? (
          <div style={{ ...styles.empty, color: theme.textMuted }}>Loading...</div>
        ) : rootNodes.length === 0 ? (
          <div style={{ ...styles.empty, color: theme.textMuted }}>
            <p style={{ marginBottom: 8, fontSize: 14 }}>No branches yet</p>
            <p style={{ fontSize: 12 }}>
              Select text in a ChatGPT conversation and click "Branch" to start exploring
            </p>
          </div>
        ) : (
          <div style={styles.treeContainer}>
            {rootNodes
              .filter((root) => !isSearching || matchingNodeIds.has(root.id))
              .map((root, idx, arr) => (
                <TreeView
                  key={root.id}
                  node={root}
                  allNodes={nodes}
                  depth={0}
                  isLast={idx === arr.length - 1}
                  activeUrl={activeUrl}
                  searchQuery={isSearching ? searchQuery : ""}
                  visibleNodeIds={isSearching ? matchingNodeIds : null}
                  onNavigate={handleNavigate}
                  onRename={handleRename}
                  onDelete={handleDelete}
                />
              ))}
          </div>
        )}
      </div>
    </ThemeContext.Provider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  header: {
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
  },
  empty: {
    padding: 24,
    textAlign: "center" as const,
  },
  treeContainer: {
    flex: 1,
    overflow: "auto",
    padding: "8px 0",
  },
};

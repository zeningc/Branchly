import { useState } from "react";
import type { TreeNode } from "../types";
import { useTheme } from "./App";

interface TreeViewProps {
  node: TreeNode;
  allNodes: TreeNode[];
  depth: number;
  isLast: boolean;
  activeUrl: string;
  searchQuery: string;
  visibleNodeIds: Set<string> | null;
  onNavigate: (chatUrl: string) => void;
  onRename: (nodeId: string, newName: string) => void;
  onDelete: (nodeId: string) => void;
}

export function TreeView({
  node,
  allNodes,
  depth,
  isLast,
  activeUrl,
  searchQuery,
  visibleNodeIds,
  onNavigate,
  onRename,
  onDelete,
}: TreeViewProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const [showMenu, setShowMenu] = useState(false);

  const children = allNodes.filter((n) => n.parentId === node.id);
  const visibleChildren = visibleNodeIds
    ? children.filter((c) => visibleNodeIds.has(c.id))
    : children;
  const hasChildren = visibleChildren.length > 0;
  const isActive = activeUrl && node.chatUrl && activeUrl === node.chatUrl;

  const handleSaveRename = () => {
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName.trim());
    }
    setEditing(false);
  };

  const indent = depth * 20;

  // Highlight matching text in node name
  const renderName = () => {
    if (!searchQuery) return node.name;
    const idx = node.name.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (idx === -1) return node.name;
    const before = node.name.slice(0, idx);
    const match = node.name.slice(idx, idx + searchQuery.length);
    const after = node.name.slice(idx + searchQuery.length);
    return (
      <>
        {before}
        <span style={{ background: "rgba(99, 102, 241, 0.4)", borderRadius: 2, padding: "0 1px" }}>
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Vertical line from parent */}
      {depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: 12 + (depth - 1) * 20 + 9,
            top: 0,
            bottom: isLast ? "50%" : 0,
            width: 1,
            background: theme.treeLine,
          }}
        />
      )}

      {/* Horizontal connector */}
      {depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: 12 + (depth - 1) * 20 + 9,
            top: "50%",
            width: 12,
            height: 1,
            background: theme.treeLine,
          }}
        />
      )}

      {/* Node row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "5px 12px",
          paddingLeft: 12 + indent,
          cursor: "pointer",
          position: "relative",
          borderRadius: 4,
          marginLeft: 4,
          marginRight: 4,
          background: isActive ? theme.activeNodeBg : "transparent",
          borderLeft: isActive ? `2px solid ${theme.accent}` : "2px solid transparent",
          transition: "background 0.15s",
        }}
        onMouseEnter={() => setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {/* Expand/collapse toggle */}
        <button
          style={{
            background: hasChildren ? theme.bgSecondary : "none",
            border: "none",
            color: hasChildren ? theme.accent : theme.textMuted,
            fontSize: 10,
            cursor: "pointer",
            width: 18,
            height: 18,
            textAlign: "center" as const,
            flexShrink: 0,
            padding: 0,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          onClick={() => setExpanded(!expanded)}
        >
          {hasChildren ? (expanded ? "\u25BE" : "\u25B8") : "\u2022"}
        </button>

        {/* Node name / editing */}
        {editing ? (
          <input
            style={{
              flex: 1,
              background: theme.inputBg,
              border: `1px solid ${theme.accent}`,
              borderRadius: 4,
              color: theme.text,
              fontSize: 13,
              padding: "2px 6px",
              outline: "none",
              marginLeft: 4,
            }}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveRename();
              if (e.key === "Escape") setEditing(false);
            }}
            autoFocus
          />
        ) : (
          <button
            style={{
              background: "none",
              border: "none",
              color: isActive ? theme.accent : theme.text,
              fontWeight: isActive ? 600 : 400,
              fontSize: 13,
              cursor: "pointer",
              textAlign: "left" as const,
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap" as const,
              padding: "2px 6px",
              borderRadius: 4,
              marginLeft: 4,
            }}
            onClick={() => node.chatUrl && onNavigate(node.chatUrl)}
            title={node.selectedText || node.name}
          >
            {depth === 0 && (
              <span style={{
                fontSize: 9,
                background: node.platform === "gemini" ? "#4285f4" : "#10a37f",
                color: "white",
                borderRadius: 3,
                padding: "1px 4px",
                marginRight: 4,
                fontWeight: 700,
                letterSpacing: 0.3,
                flexShrink: 0,
              }}>
                {node.platform === "gemini" ? "G" : "C"}
              </span>
            )}
            {renderName()}
          </button>
        )}

        {/* Action buttons */}
        {showMenu && !editing && (
          <div style={{ display: "flex", gap: 2, marginLeft: 4 }}>
            <ActionBtn
              title="Rename"
              onClick={() => { setEditName(node.name); setEditing(true); }}
            >
              &#9998;
            </ActionBtn>
            <ActionBtn
              title="Delete"
              onClick={() => {
                if (confirm("Delete this branch and all its children?")) {
                  onDelete(node.id);
                }
              }}
            >
              &#128465;
            </ActionBtn>
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div style={{ position: "relative" }}>
          {visibleChildren.map((child, idx) => (
            <TreeView
              key={child.id}
              node={child}
              allNodes={allNodes}
              depth={depth + 1}
              isLast={idx === visibleChildren.length - 1}
              activeUrl={activeUrl}
              searchQuery={searchQuery}
              visibleNodeIds={visibleNodeIds}
              onNavigate={onNavigate}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  return (
    <button
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        fontSize: 13,
        padding: "2px 4px",
        borderRadius: 4,
        opacity: 0.6,
        color: theme.text,
        lineHeight: 1,
      }}
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

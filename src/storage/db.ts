import { openDB, type IDBPDatabase } from "idb";
import type { TreeNode } from "../types";

const DB_NAME = "deepdive";
const DB_VERSION = 1;
const STORE_NAME = "nodes";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("parentId", "parentId");
          store.createIndex("chatUrl", "chatUrl");
        }
      },
    });
  }
  return dbPromise;
}

export async function getAllNodes(): Promise<TreeNode[]> {
  const db = await getDB();
  return db.getAll(STORE_NAME);
}

export async function getNode(id: string): Promise<TreeNode | undefined> {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getNodeByChatUrl(
  chatUrl: string
): Promise<TreeNode | undefined> {
  const db = await getDB();
  const index = db.transaction(STORE_NAME).store.index("chatUrl");
  return index.get(chatUrl);
}

export async function saveNode(node: TreeNode): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAME, node);
}

export async function deleteNode(id: string): Promise<void> {
  const db = await getDB();
  const node = await db.get(STORE_NAME, id);
  if (!node) return;

  // Remove from parent's children list
  if (node.parentId) {
    const parent = await db.get(STORE_NAME, node.parentId);
    if (parent) {
      parent.children = parent.children.filter((cid: string) => cid !== id);
      await db.put(STORE_NAME, parent);
    }
  }

  // Recursively delete children
  for (const childId of node.children) {
    await deleteNode(childId);
  }

  await db.delete(STORE_NAME, id);
}

export async function updateNodeName(
  id: string,
  newName: string
): Promise<void> {
  const db = await getDB();
  const node = await db.get(STORE_NAME, id);
  if (node) {
    node.name = newName;
    await db.put(STORE_NAME, node);
  }
}

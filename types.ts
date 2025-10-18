// types.ts

// --- New Virtual File System Types ---

export type NodeType = 'file' | 'folder';

export interface BaseNode {
  id: string;               // unique id
  name: string;             // name only (not full path)
  type: NodeType;
  parentId: string | null;  // null for root
  createdAt: string;
  updatedAt: string;
}

export interface FileNode extends BaseNode {
  type: 'file';
  content: string;
}

export interface FolderNode extends BaseNode {
  type: 'folder';
  childrenIds: string[]; // order of children
}

export type Node = FileNode | FolderNode;

export interface Project {
  id: string;
  name: string;
  rootId: string; // id of root folder
  nodes: Record<string, Node>;
  createdAt: string;
  updatedAt: string;
}


// --- Other Application Types ---

export interface Settings {
  fontSize: number;
  autosaveInterval: number; // in seconds, 0 for off
  lineWrap: boolean;
  theme: 'dark' | 'light';
  tabSize: number;
  allowExternal: boolean;
}

export type LogType = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp: string;
  data: any[];
}

export type FileType = 'html' | 'css' | 'javascript';

export interface ProjectFile {
  id: string;
  path: string; // e.g., "src/index.html"
  content: string;
}

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
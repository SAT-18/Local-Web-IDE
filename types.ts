
export type FileType = 'html' | 'css' | 'javascript';

export interface ProjectFile {
  id: string;
  name: string;
  content: string;
  type: FileType;
}

export interface Settings {
  fontSize: number;
  autosaveInterval: number; // in seconds, 0 for off
  lineWrap: boolean;
}

export type LogType = 'log' | 'warn' | 'error' | 'info';

export interface LogEntry {
  id: string;
  type: LogType;
  timestamp: string;
  data: any[];
}

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ProjectFile, Settings, LogEntry, LogType } from './types';
import { DEFAULT_FILES, DEFAULT_SETTINGS } from './constants';
import { useDebounce } from './hooks/useDebounce';
import * as db from './services/db';
import { FileIcon, SaveIcon, ExportIcon, ImportIcon, SettingsIcon, ChevronDownIcon, TrashIcon, XIcon, RefreshCwIcon, MenuIcon, PlusIcon, FolderIcon, FolderOpenIcon } from './components/icons';

// --- TYPES & HELPERS ---

type FSTreeNode = {
  name: string;
  path: string;
  children?: FSTreeNode[];
  file?: ProjectFile;
};

function buildFileTree(files: ProjectFile[]): FSTreeNode[] {
    const root: { [key: string]: FSTreeNode } = {};

    files.forEach(file => {
        const parts = file.path.split('/');
        let currentLevel = root;
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            const isFile = index === parts.length - 1;

            if (!currentLevel[part]) {
                currentLevel[part] = {
                    name: part,
                    path: currentPath,
                    children: isFile ? undefined : [],
                    file: isFile ? file : undefined,
                };
            }

            if (!isFile) {
                // Ensure children array exists for directories
                if (!currentLevel[part].children) {
                    currentLevel[part].children = [];
                }
                // This is safe because we just created it if it didn't exist
                currentLevel = currentLevel[part].children as unknown as { [key: string]: FSTreeNode };
            }
        });
    });
    
    // Sort helper
    const sortNodes = (nodes: FSTreeNode[]) => {
      nodes.sort((a, b) => {
        // Folders first
        if (a.children && !b.children) return -1;
        if (!a.children && b.children) return 1;
        // Then by name
        return a.name.localeCompare(b.name);
      });
      // Recursively sort children
      nodes.forEach(node => {
        if (node.children) {
          sortNodes(node.children);
        }
      });
    };
    
    const tree = Object.values(root);
    sortNodes(tree);
    return tree;
}

const getFileExtension = (path: string) => path.split('.').pop()?.toLowerCase() ?? '';

// --- UI COMPONENTS ---

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, label, ...props }) => (
  <button aria-label={label} title={label} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-[color:var(--muted)] bg-[color:var(--surface)] hover:bg-[color:var(--accent)] hover:text-[#0d1117] transition-colors duration-200" {...props}>
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

const Topbar: React.FC<{ onNew: () => void; onSave: () => void; onExport: () => void; onImport: (e: React.ChangeEvent<HTMLInputElement>) => void; onSettings: () => void; onMenuClick: () => void; }> = ({ onNew, onSave, onExport, onImport, onSettings, onMenuClick }) => {
    const importInputRef = useRef<HTMLInputElement>(null);
    return (
        <header className="bg-[color:var(--panel)] flex items-center justify-between p-2 border-b border-[color:var(--surface)] shadow-md flex-shrink-0">
            <div className="flex items-center gap-2">
                <button onClick={onMenuClick} className="p-2 -ml-2 text-[color:var(--muted)] hover:text-[color:var(--text)]" aria-label="Toggle File Explorer">
                    <MenuIcon className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-[color:var(--text)]">SAT18 Web IDE</h1>
                    <span className="hidden lg:inline text-xs text-[color:var(--muted)]">Monorepo-ready • All data stays local</span>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <IconButton icon={<FileIcon className="h-4 w-4" />} label="New Project" onClick={onNew} />
                <IconButton icon={<SaveIcon className="h-4 w-4" />} label="Save" onClick={onSave} />
                <IconButton icon={<ExportIcon className="h-4 w-4" />} label="Export" onClick={onExport} />
                <input type="file" ref={importInputRef} onChange={onImport} accept=".json" className="hidden" />
                <IconButton icon={<ImportIcon className="h-4 w-4" />} label="Import" onClick={() => importInputRef.current?.click()} />
                <IconButton icon={<SettingsIcon className="h-4 w-4" />} label="Settings" onClick={onSettings} />
            </div>
        </header>
    );
};

const FileSystemEntry: React.FC<{
  node: FSTreeNode;
  level: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  onFileSelect: (id: string) => void;
  onDeleteFile: (id: string) => void;
  onToggleFolder: (path: string) => void;
}> = ({ node, level, activeFileId, expandedFolders, onFileSelect, onDeleteFile, onToggleFolder }) => {
  const isFolder = !!node.children;
  const isExpanded = expandedFolders.has(node.path);

  if (isFolder) {
    return (
      <div>
        <div
          onClick={() => onToggleFolder(node.path)}
          className="flex items-center group p-1.5 text-sm rounded cursor-pointer transition-colors text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]"
          style={{ paddingLeft: `${level * 1 + 0.5}rem` }}
        >
          {isExpanded ? <FolderOpenIcon className="h-4 w-4 mr-2 flex-shrink-0" /> : <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" />}
          <span className="truncate flex-1 font-semibold">{node.name}</span>
        </div>
        {isExpanded && node.children && (
          <div>
            {node.children.map(child => (
              <FileSystemEntry key={child.path} node={child} level={level + 1} {...{ activeFileId, expandedFolders, onFileSelect, onDeleteFile, onToggleFolder }} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // It's a file
  return (
    <div
      onClick={() => onFileSelect(node.file!.id)}
      className={`flex items-center justify-between group p-1.5 text-sm rounded cursor-pointer transition-colors ${
        activeFileId === node.file!.id ? 'bg-[color:var(--accent)] text-[#0d1117] font-bold' : 'text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]'
      }`}
      style={{ paddingLeft: `${level * 1 + 0.5}rem` }}
    >
      <div className="flex items-center truncate flex-1">
        <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span className="truncate">{node.name}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDeleteFile(node.file!.id); }}
        title={`Delete ${node.name}`}
        className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/20 text-red-400 flex-shrink-0"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

const FileExplorer: React.FC<{
  files: ProjectFile[];
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onNewFile: () => void;
  onDeleteFile: (id: string) => void;
}> = ({ files, activeFileId, onFileSelect, onNewFile, onDeleteFile }) => {
  const fileTree = useMemo(() => buildFileTree(files), [files]);
  const [expandedFolders, setExpandedFolders] = useState(() => {
    // Automatically expand parent folders of the active file on initial load
    const activeFile = files.find(f => f.id === activeFileId);
    const expanded = new Set<string>();
    if (activeFile) {
        const parts = activeFile.path.split('/');
        parts.pop(); // remove filename
        let currentPath = '';
        for (const part of parts) {
            currentPath = currentPath ? `${currentPath}/${part}` : part;
            expanded.add(currentPath);
        }
    }
    return expanded;
  });

  const handleToggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col bg-[color:var(--editor-gutter)] w-60 p-2 border-r border-[color:var(--surface)] h-full">
      <div className="flex justify-between items-center mb-2 p-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--muted)]">Project Files</h3>
        <button onClick={onNewFile} title="New File" className="p-1 rounded hover:bg-[color:var(--surface)]">
          <PlusIcon className="h-4 w-4 text-[color:var(--muted)]" />
        </button>
      </div>
      <div className="flex-grow overflow-y-auto">
        {fileTree.map(node => (
          <FileSystemEntry
            key={node.path}
            node={node}
            level={0}
            activeFileId={activeFileId}
            expandedFolders={expandedFolders}
            onFileSelect={onFileSelect}
            onDeleteFile={onDeleteFile}
            onToggleFolder={handleToggleFolder}
          />
        ))}
      </div>
    </div>
  );
};


const EditorPanel: React.FC<{ files: ProjectFile[]; activeFileId: string | null; onFileChange: (id: string, content: string) => void; onFileSelect: (id: string) => void; settings: Settings; }> = ({ files, activeFileId, onFileChange, onFileSelect, settings }) => {
  const activeFile = files.find(f => f.id === activeFileId);
  if (!activeFile) {
    return (
        <div className="flex flex-col bg-[color:var(--panel)] h-full items-center justify-center text-[color:var(--muted)]">
            <p>No file selected.</p>
            <p className="text-sm">Select a file from the explorer to begin editing.</p>
        </div>
    );
  }
  return (
    <div className="flex flex-col bg-[color:var(--panel)] h-full">
      <div className="flex border-b border-[color:var(--surface)] bg-[color:var(--editor-gutter)] overflow-x-auto">
        {files.map(file => (
          <button key={file.id} onClick={() => onFileSelect(file.id)} className={`px-4 py-2 text-sm border-r border-[color:var(--surface)] transition-colors whitespace-nowrap ${activeFileId === file.id ? 'bg-[color:var(--panel)] text-[color:var(--text)]' : 'text-[color:var(--muted)] hover:bg-[color:var(--surface)]'}`}>
            {file.path.split('/').pop()}
          </button>
        ))}
      </div>
      <textarea value={activeFile.content} onChange={(e) => onFileChange(activeFile.id, e.target.value)} className="flex-grow w-full p-4 bg-[color:var(--editor-bg)] text-[color:var(--text)] font-mono focus:outline-none resize-none" style={{ fontSize: `${settings.fontSize}px`, whiteSpace: settings.lineWrap ? 'pre-wrap' : 'pre', overflowWrap: 'break-word', tabSize: settings.tabSize, MozTabSize: settings.tabSize }} spellCheck="false" />
    </div>
  );
};

const PreviewPanel: React.FC<{ srcDoc: string }> = ({ srcDoc }) => (
    <iframe srcDoc={srcDoc} title="preview" sandbox="allow-scripts allow-same-origin" className="w-full h-full bg-white border-none" />
);

const Console: React.FC<{ logs: LogEntry[]; onClear: () => void; onReset: () => void; isOpen: boolean; onToggle: () => void; }> = ({ logs, onClear, onReset, isOpen, onToggle }) => {
    const logColors: Record<LogType, string> = { log: 'text-[color:var(--text)]', warn: 'text-yellow-400', error: 'text-[color:var(--error)]', info: 'text-blue-400' };
    return (
        <div className="bg-[color:var(--panel)] border-t border-[color:var(--surface)]">
            <div className="flex items-center justify-between p-2 cursor-pointer" onClick={onToggle}>
                <h3 className="font-bold text-sm">Console ({logs.length})</h3>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onReset(); }} title="Reset Preview" className="p-1 rounded hover:bg-[color:var(--surface)]"><RefreshCwIcon className="h-4 w-4 text-[color:var(--muted)]" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} title="Clear Console" className="p-1 rounded hover:bg-[color:var(--surface)]"><TrashIcon className="h-4 w-4 text-[color:var(--muted)]" /></button>
                    <ChevronDownIcon className={`h-5 w-5 text-[color:var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                 <div className="overflow-y-auto h-48 p-2 font-mono text-xs bg-[color:var(--editor-gutter)]">
                 {logs.map(log => (
                     <div key={log.id} className={`flex gap-2 items-start py-1 border-b border-[color:var(--surface)] ${logColors[log.type]}`}>
                         <span className="text-[color:var(--muted)] flex-shrink-0">{log.timestamp}</span>
                         <div className="flex-grow break-all">
                             {log.data.map((d, i) => {
                                let content;
                                if (typeof d === 'object' && d !== null) {
                                    content = d.stack ? <pre className="whitespace-pre-wrap font-sans">{d.stack}</pre> : <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(d, null, 2)}</pre>;
                                } else { content = String(d); }
                                return <span key={i} className="mr-2">{content}</span>
                             })}
                         </div>
                     </div>
                 ))}
                 {logs.length === 0 && <p className="text-[color:var(--muted)]">No logs — run your code to see output.</p>}
             </div>
            )}
        </div>
    );
};

const StatusBar: React.FC<{ activeFilePath: string; saveStatus: string; projectSize: string; }> = ({ activeFilePath, saveStatus, projectSize }) => (
    <div className="bg-[color:var(--editor-gutter)] text-xs text-[color:var(--muted)] px-4 py-1 flex justify-between items-center border-t border-[color:var(--surface)]">
        <div className="flex items-center gap-4">
            <span>Path: {activeFilePath}</span>
            <span>Size: {projectSize}</span>
        </div>
        <span>{saveStatus}</span>
    </div>
);

const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: Settings; onSettingsChange: (s: Settings) => void; }> = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;
    const handleChange = <K extends keyof Settings,>(field: K, value: Settings[K]) => onSettingsChange({ ...settings, [field]: value });
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-[color:var(--panel)] rounded-lg shadow-2xl p-6 w-full max-w-md border border-[color:var(--surface)]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-[color:var(--text)]">Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[color:var(--surface)]"><XIcon className="h-5 w-5 text-[color:var(--muted)]" /></button>
                </div>
                <div className="space-y-4 text-[color:var(--text)]">
                    <div>
                        <label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Theme</label>
                        <select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value as 'dark' | 'light')} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"><option value="dark">Dark</option><option value="light">Light</option></select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Font Size: {settings.fontSize}px</label>
                        <input type="range" min="10" max="24" value={settings.fontSize} onChange={(e) => handleChange('fontSize', parseInt(e.target.value, 10))} className="w-full h-2 bg-[color:var(--surface)] rounded-lg appearance-none cursor-pointer accent-[color:var(--accent)]" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Tab Size</label>
                        <input type="number" min="1" max="8" value={settings.tabSize} onChange={(e) => handleChange('tabSize', parseInt(e.target.value, 10))} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Autosave Interval</label>
                        <select value={settings.autosaveInterval} onChange={(e) => handleChange('autosaveInterval', parseInt(e.target.value, 10))} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"><option value="0">Off</option><option value="5">5 seconds</option><option value="10">10 seconds</option><option value="30">30 seconds</option></select>
                    </div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[color:var(--muted)]">Line Wrap</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.lineWrap} onChange={(e) => handleChange('lineWrap', e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-[color:var(--surface)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div></label></div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[color:var(--muted)]">Allow External Resources</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.allowExternal} onChange={(e) => handleChange('allowExternal', e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-[color:var(--surface)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div></label></div>
                </div>
            </div>
        </div>
    );
};

const Toast: React.FC<{ message: string; onClose: () => void; type: 'error' | 'info' }> = ({ message, onClose, type }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = type === 'error' ? 'bg-[color:var(--error)] text-white' : 'bg-[color:var(--success)] text-white';
  
  return (
    <div className={`fixed bottom-12 right-4 p-4 rounded-lg shadow-lg z-50 ${colors} flex items-center gap-4 animate-fade-in-up`}>
      <span>{message}</span>
      <button onClick={onClose} className="p-1 rounded-full hover:bg-black/20"><XIcon className="h-4 w-4" /></button>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string | null>(DEFAULT_FILES[0].id);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setConsoleOpen] = useState(true);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Ready');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [previewKey, setPreviewKey] = useState(0);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'error' | 'info' } | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [isFileExplorerOpen, setFileExplorerOpen] = useState(true);

  const mainContainerRef = useRef<HTMLDivElement>(null);
  const debouncedFiles = useDebounce(files, 500);
  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) ?? null, [files, activeFileId]);

  const projectSize = useMemo(() => {
    const totalBytes = files.reduce((acc, file) => acc + new Blob([file.content]).size, 0);
    if (totalBytes < 1024) return `${totalBytes} B`;
    if (totalBytes < 1024 * 1024) return `${(totalBytes / 1024).toFixed(2)} KB`;
    return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
  }, [files]);
  
  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!mainContainerRef.current) return;
        const { left, width } = mainContainerRef.current.getBoundingClientRect();
        const newEditorWidth = ((moveEvent.clientX - left) / width) * 100;
        if (newEditorWidth > 15 && newEditorWidth < 85) {
            mainContainerRef.current.style.setProperty('--editor-width', `${newEditorWidth}%`);
        }
    };
    const handleMouseUp = () => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  useEffect(() => {
    (async () => {
      const loadedFiles = await db.loadFiles();
      if (loadedFiles?.length > 0) { setFiles(loadedFiles); setActiveFileId(loadedFiles[0].id); }
      const loadedSettings = await db.loadSettings();
      if (loadedSettings) setSettings(loadedSettings);
      setSaveStatus('Loaded');
    })();
  }, []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', settings.theme); }, [settings.theme]);
  useEffect(() => { db.saveSettings(settings); }, [settings]);
  
  const handleSaveProject = useCallback(async () => {
    setSaveStatus('Saving...');
    await db.saveFiles(files);
    setHasUnsavedChanges(false);
    setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
  }, [files]);

  useEffect(() => {
    if (!hasUnsavedChanges || settings.autosaveInterval === 0) return;
    setSaveStatus('Saving...');
    const timer = setTimeout(handleSaveProject, settings.autosaveInterval * 1000);
    return () => clearTimeout(timer);
  }, [files, settings.autosaveInterval, hasUnsavedChanges, handleSaveProject]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSaveProject(); }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveProject]);

  const handleFileChange = useCallback((id: string, content: string) => {
    setFiles(currentFiles => currentFiles.map(file => (file.id === id ? { ...file, content } : file)));
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
    setSaveStatus('Unsaved changes');
  }, [hasUnsavedChanges]);

  const generatePreviewContent = useCallback((projectFiles: ProjectFile[], currentSettings: Settings): string => {
    const htmlFile = projectFiles.find(f => f.path.endsWith('.html'));
    const cssFiles = projectFiles.filter(f => f.path.endsWith('.css'));
    const jsFile = projectFiles.find(f => f.path.endsWith('.js') || f.path.endsWith('.mjs'));
    const csp = currentSettings.allowExternal ? `` : `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; font-src 'none';">`;
    const consoleForwarder = `(function(){const s=(t,d)=>{try{const e=d.map(i=>{if(i instanceof Error)return{message:i.message,stack:i.stack,name:i.name};try{return JSON.parse(JSON.stringify(i))}catch(r){return String(i)}});window.parent.postMessage({type:t,data:e},"*")}catch(i){window.parent.postMessage({type:t,data:["Error serializing log data"]},"*")}};["log","error","warn","info"].forEach(t=>{const d=console[t];console[t]=function(...e){s(t,e);d.apply(console,e)}});window.addEventListener("error",t=>s("error",[t.message,t.filename,t.lineno,t.colno,t.error]));window.addEventListener("unhandledrejection",t=>s("error",[t.reason]))})();`;
    const styles = cssFiles.map(f => `<style>${f.content}</style>`).join('\n');
    return `<!DOCTYPE html><html><head>${csp}${styles}</head><body>${htmlFile?.content||''}<script>${consoleForwarder}<\/script><script>try{${jsFile?.content||''}}catch(e){console.error(e)}<\/script></body></html>`;
  }, []);

  const srcDoc = useMemo(() => generatePreviewContent(debouncedFiles, settings), [debouncedFiles, settings, generatePreviewContent]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (['log', 'warn', 'error', 'info'].includes(type)) {
        setLogs(prev => [...prev, { id: crypto.randomUUID(), type: type as LogType, timestamp: new Date().toLocaleTimeString(), data }]);
        if (type === 'error') {
          setToast({ id: Date.now(), message: 'Error in preview. See console.', type: 'error' });
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNewProject = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure?')) return;
    setFiles(DEFAULT_FILES);
    setActiveFileId(DEFAULT_FILES[0].id);
    setLogs([]);
    setHasUnsavedChanges(false);
    setSaveStatus('New project');
  };

  const handleNewFile = () => {
    const path = prompt("Enter new file path (e.g., src/components/Button.js):");
    if (!path) return;
    if (files.some(f => f.path === path)) {
        alert("A file with this path already exists.");
        return;
    }

    const newFile: ProjectFile = { id: crypto.randomUUID(), path, content: `// New file: ${path}` };
    setFiles(current => [...current, newFile]);
    setActiveFileId(newFile.id);
    setHasUnsavedChanges(true);
  };

  const handleDeleteFile = (id: string) => {
      const fileToDelete = files.find(f => f.id === id);
      if (!fileToDelete) return;
      if (files.length === 1) {
        setToast({id: Date.now(), message: "Cannot delete the last file.", type: 'error'});
        return;
      }
      if (!window.confirm(`Are you sure you want to delete ${fileToDelete.path}?`)) return;

      setFiles(current => {
          const newFiles = current.filter(f => f.id !== id);
          if (activeFileId === id) {
              setActiveFileId(newFiles[0]?.id ?? null);
          }
          return newFiles;
      });
      setHasUnsavedChanges(true);
  };
  
  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes that will be lost. Continue?')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { files: newFiles, settings: newSettings } = JSON.parse(e.target?.result as string);
        if (Array.isArray(newFiles) && newFiles.every(f => 'id' in f && 'path' in f && 'content' in f) && newSettings) {
          setFiles(newFiles);
          setSettings(newSettings);
          setActiveFileId(newFiles[0]?.id || null);
          setLogs([]);
          setHasUnsavedChanges(false);
          setSaveStatus('Project imported');
        } else { alert('Invalid project file format.'); }
      } catch (error) { alert('Error reading project file.'); console.error(error); }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportProject = () => {
    const blob = new Blob([JSON.stringify({ files, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'web-ide-project.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  
  const handleResetPreview = () => setPreviewKey(k => k + 1);

  return (
    <div className="flex flex-col h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      <Topbar onNew={handleNewProject} onSave={handleSaveProject} onExport={handleExportProject} onImport={handleImportProject} onSettings={() => setSettingsModalOpen(true)} onMenuClick={() => setFileExplorerOpen(prev => !prev)} />
      
      <div className="flex flex-1 overflow-hidden">
        {isFileExplorerOpen && (
          <FileExplorer
            files={files}
            activeFileId={activeFileId}
            onFileSelect={setActiveFileId}
            onNewFile={handleNewFile}
            onDeleteFile={handleDeleteFile}
          />
        )}
        <div className="flex-1 flex flex-col overflow-hidden">
          <main 
            ref={mainContainerRef} 
            className="flex-grow grid grid-cols-1 md:grid md:grid-cols-[var(--editor-width)_4px_1fr] overflow-hidden"
            style={{ '--editor-width': '50%' } as React.CSSProperties}
          >
            <div className={`flex flex-col h-full overflow-hidden ${mobileView !== 'editor' && 'hidden'} md:!flex`}>
              <EditorPanel files={files} activeFileId={activeFileId} onFileChange={handleFileChange} onFileSelect={setActiveFileId} settings={settings} />
            </div>

            <div 
                onMouseDown={startResize}
                className={`hidden md:block w-1 cursor-col-resize bg-[color:var(--surface)] hover:bg-[color:var(--accent)] transition-colors duration-200 ${isResizing ? 'bg-[color:var(--accent)]' : ''}`}
            />

            <div className={`flex flex-col h-full overflow-hidden border-l border-[color:var(--surface)] md:border-l-0 ${mobileView !== 'preview' && 'hidden'} md:!flex`}>
              <div className="flex-grow"><PreviewPanel key={previewKey} srcDoc={srcDoc} /></div>
              <Console logs={logs} onClear={() => setLogs([])} onReset={handleResetPreview} isOpen={isConsoleOpen} onToggle={() => setConsoleOpen(!isConsoleOpen)} />
            </div>
          </main>

          <div className="md:hidden flex bg-[color:var(--panel)] border-t border-[color:var(--surface)]">
            <button onClick={() => setMobileView('editor')} className={`flex-1 p-3 font-bold text-center transition-colors ${mobileView === 'editor' ? 'bg-[color:var(--accent)] text-[#0d1117]' : 'text-[color:var(--muted)]'}`}>Editor</button>
            <button onClick={() => setMobileView('preview')} className={`flex-1 p-3 font-bold text-center transition-colors ${mobileView === 'preview' ? 'bg-[color:var(--accent)] text-[#0d1117]' : 'text-[color:var(--muted)]'}`}>Preview</button>
          </div>

          <StatusBar activeFilePath={activeFile?.path ?? 'No File Selected'} saveStatus={saveStatus} projectSize={projectSize} />
        </div>
      </div>
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} settings={settings} onSettingsChange={setSettings} />
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
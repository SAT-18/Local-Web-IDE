
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { ProjectFile, Settings, LogEntry, LogType } from './types';
import { DEFAULT_FILES, DEFAULT_SETTINGS } from './constants';
import { useDebounce } from './hooks/useDebounce';
import * as db from './services/db';
import { FileIcon, SaveIcon, ExportIcon, ImportIcon, SettingsIcon, MenuIcon, ChevronDownIcon, TrashIcon, XIcon } from './components/icons';

// --- HELPER & UI COMPONENTS (Defined outside main component to prevent re-renders) ---

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string;
}

const IconButton: React.FC<IconButtonProps> = ({ icon, label, ...props }) => (
  <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-[#9aa4b2] bg-[#0f1624] hover:bg-[#7c5cff] hover:text-white transition-colors duration-200" {...props}>
    {icon}
    <span>{label}</span>
  </button>
);

interface TopbarProps {
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSettings: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onNew, onSave, onExport, onImport, onSettings }) => {
    const importInputRef = useRef<HTMLInputElement>(null);

    return (
        <header className="bg-[#0b1220] flex items-center justify-between p-2 border-b border-[#0f1624] shadow-md">
            <div className="flex items-center gap-4">
                <MenuIcon className="h-6 w-6 text-[#9aa4b2] md:hidden" />
                <h1 className="text-xl font-bold text-white">Local Web IDE</h1>
            </div>
            <div className="flex items-center gap-2">
                <IconButton icon={<FileIcon className="h-4 w-4" />} label="New" onClick={onNew} />
                <IconButton icon={<SaveIcon className="h-4 w-4" />} label="Save" onClick={onSave} />
                <IconButton icon={<ExportIcon className="h-4 w-4" />} label="Export" onClick={onExport} />
                <input type="file" ref={importInputRef} onChange={onImport} accept=".json" className="hidden" />
                <IconButton icon={<ImportIcon className="h-4 w-4" />} label="Import" onClick={() => importInputRef.current?.click()} />
                <IconButton icon={<SettingsIcon className="h-4 w-4" />} label="Settings" onClick={onSettings} />
            </div>
        </header>
    );
};

interface EditorPanelProps {
  files: ProjectFile[];
  activeFileId: string;
  onFileChange: (id: string, content: string) => void;
  onFileSelect: (id: string) => void;
  settings: Settings;
}

const EditorPanel: React.FC<EditorPanelProps> = ({ files, activeFileId, onFileChange, onFileSelect, settings }) => {
  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div className="flex flex-col bg-[#0b1220] h-full">
      <div className="flex border-b border-[#0f1624] bg-[#071023]">
        {files.map(file => (
          <button
            key={file.id}
            onClick={() => onFileSelect(file.id)}
            className={`px-4 py-2 text-sm border-r border-[#0f1624] transition-colors ${
              activeFileId === file.id ? 'bg-[#0b1220] text-white' : 'text-[#9aa4b2] hover:bg-[#0f1624]'
            }`}
          >
            {file.name}
          </button>
        ))}
      </div>
      <textarea
        value={activeFile?.content || ''}
        onChange={(e) => activeFile && onFileChange(activeFile.id, e.target.value)}
        className="flex-grow w-full p-4 bg-[#0b1220] text-[#dbe7ff] font-mono focus:outline-none resize-none"
        style={{ fontSize: `${settings.fontSize}px`, whiteSpace: settings.lineWrap ? 'pre-wrap' : 'pre', overflowWrap: 'break-word' }}
        spellCheck="false"
      />
    </div>
  );
};

interface PreviewPanelProps {
  srcDoc: string;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ srcDoc }) => (
    <iframe
        srcDoc={srcDoc}
        title="preview"
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full bg-white border-none"
    />
);

interface ConsoleProps {
    logs: LogEntry[];
    onClear: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

const Console: React.FC<ConsoleProps> = ({ logs, onClear, isOpen, onToggle }) => {
    const logColors: Record<LogType, string> = {
        log: 'text-[#dbe7ff]',
        warn: 'text-yellow-400',
        error: 'text-[#ff6b6b]',
        info: 'text-blue-400',
    };

    return (
        <div className="bg-[#0b1220] border-t border-[#0f1624]">
            <div className="flex items-center justify-between p-2 cursor-pointer" onClick={onToggle}>
                <h3 className="font-bold text-sm">Console ({logs.length})</h3>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1 rounded hover:bg-[#0f1624]"><TrashIcon className="h-4 w-4 text-[#9aa4b2]" /></button>
                    <ChevronDownIcon className={`h-5 w-5 text-[#9aa4b2] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {isOpen && (
                 <div className="overflow-y-auto h-48 p-2 font-mono text-xs bg-[#071023]">
                 {logs.map(log => (
                     <div key={log.id} className={`flex gap-2 items-start py-1 border-b border-[#0f1624] ${logColors[log.type]}`}>
                         <span className="text-[#9aa4b2]">{log.timestamp}</span>
                         <div className="flex-grow">
                             {log.data.map((d, i) => <span key={i}>{typeof d === 'object' ? JSON.stringify(d, null, 2) : String(d)} </span>)}
                         </div>
                     </div>
                 ))}
                 {logs.length === 0 && <p className="text-[#9aa4b2]">Console is empty.</p>}
             </div>
            )}
        </div>
    );
};

interface StatusBarProps {
    activeFileName: string;
    saveStatus: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ activeFileName, saveStatus }) => (
    <div className="bg-[#071023] text-xs text-[#9aa4b2] px-4 py-1 flex justify-between items-center border-t border-[#0f1624]">
        <span>File: {activeFileName}</span>
        <span>{saveStatus}</span>
    </div>
);

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: Settings;
    onSettingsChange: (newSettings: Settings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;

    const handleFieldChange = <K extends keyof Settings,>(field: K, value: Settings[K]) => {
        onSettingsChange({ ...settings, [field]: value });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#0b1220] rounded-lg shadow-2xl p-6 w-full max-w-md border border-[#0f1624]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-[#0f1624]"><XIcon className="h-5 w-5 text-[#9aa4b2]" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#9aa4b2] mb-1">Font Size</label>
                        <input type="range" min="10" max="24" value={settings.fontSize} onChange={(e) => handleFieldChange('fontSize', parseInt(e.target.value, 10))} className="w-full h-2 bg-[#0f1624] rounded-lg appearance-none cursor-pointer" />
                        <span className="text-white">{settings.fontSize}px</span>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#9aa4b2] mb-1">Autosave Interval</label>
                        <select value={settings.autosaveInterval} onChange={(e) => handleFieldChange('autosaveInterval', parseInt(e.target.value, 10))} className="w-full bg-[#0f1624] border border-[#0f1624] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7c5cff]">
                            <option value="0">Off</option>
                            <option value="5">5 seconds</option>
                            <option value="10">10 seconds</option>
                            <option value="30">30 seconds</option>
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                         <label className="text-sm font-medium text-[#9aa4b2]">Line Wrap</label>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings.lineWrap} onChange={(e) => handleFieldChange('lineWrap', e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-[#0f1624] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#7c5cff]"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [files, setFiles] = useState<ProjectFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = useState<string>(DEFAULT_FILES[0].id);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isConsoleOpen, setConsoleOpen] = useState(true);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved');
  
  const debouncedFiles = useDebounce(files, 500);

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId) || files[0], [files, activeFileId]);

  // Load from DB on initial render
  useEffect(() => {
    const loadInitialData = async () => {
      const loadedFiles = await db.loadFiles();
      if (loadedFiles && loadedFiles.length > 0) {
        setFiles(loadedFiles);
        setActiveFileId(loadedFiles[0].id);
      }
      const loadedSettings = await db.loadSettings();
      if (loadedSettings) {
        setSettings(loadedSettings);
      }
      setSaveStatus('Loaded from browser');
    };
    loadInitialData();
  }, []);

  // Autosave logic
  useEffect(() => {
    if (!hasUnsavedChanges || settings.autosaveInterval === 0) return;
    setSaveStatus('Saving...');
    const timer = setTimeout(() => {
        db.saveFiles(files);
        setHasUnsavedChanges(false);
        setSaveStatus(`Autosaved at ${new Date().toLocaleTimeString()}`);
    }, settings.autosaveInterval * 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, settings.autosaveInterval, hasUnsavedChanges]);
  
  // Save settings when they change
  useEffect(() => {
    db.saveSettings(settings);
  }, [settings]);


  const handleFileChange = useCallback((id: string, content: string) => {
    setFiles(currentFiles =>
      currentFiles.map(file => (file.id === id ? { ...file, content } : file))
    );
    if (!hasUnsavedChanges) setHasUnsavedChanges(true);
    setSaveStatus('Unsaved changes');
  }, [hasUnsavedChanges]);

  const generatePreviewContent = useCallback((projectFiles: ProjectFile[]): string => {
    const htmlFile = projectFiles.find(f => f.type === 'html');
    const cssFile = projectFiles.find(f => f.type === 'css');
    const jsFile = projectFiles.find(f => f.type === 'javascript');
    
    const consoleForwarder = `
      (function() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        function post(type, data) {
            try {
                window.parent.postMessage({ type, data: JSON.parse(JSON.stringify(data)) }, '*');
            } catch (e) {
                window.parent.postMessage({ type, data: ['Unserializable data'] }, '*');
            }
        }

        console.log = (...args) => { originalLog.apply(console, args); post('log', args); };
        console.warn = (...args) => { originalWarn.apply(console, args); post('warn', args); };
        console.error = (...args) => { originalError.apply(console, args); post('error', args); };

        window.addEventListener('error', (e) => {
            post('error', [e.message]);
        });
      })();
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>${cssFile?.content || ''}</style>
        </head>
        <body>
          ${htmlFile?.content || ''}
          <script>
            ${consoleForwarder}
            try {
              ${jsFile?.content || ''}
            } catch(e) {
              console.error(e.message);
            }
          </script>
        </body>
      </html>
    `;
  }, []);

  const srcDoc = useMemo(() => generatePreviewContent(debouncedFiles), [debouncedFiles, generatePreviewContent]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      if (['log', 'warn', 'error'].includes(type)) {
        setLogs(prevLogs => [
          ...prevLogs,
          {
            id: crypto.randomUUID(),
            type: type as LogType,
            timestamp: new Date().toLocaleTimeString(),
            data,
          },
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleNewProject = () => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to create a new project?')) {
        return;
    }
    setFiles(DEFAULT_FILES);
    setActiveFileId(DEFAULT_FILES[0].id);
    setLogs([]);
    setHasUnsavedChanges(false);
    setSaveStatus('New project');
  };

  const handleSaveProject = async () => {
    setSaveStatus('Saving...');
    await db.saveFiles(files);
    setHasUnsavedChanges(false);
    setSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`);
  };

  const handleExportProject = () => {
    const projectData = { files, settings };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'web-ide-project.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const handleImportProject = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (hasUnsavedChanges && !window.confirm('You have unsaved changes that will be lost. Are you sure you want to import a new project?')) {
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const projectData = JSON.parse(result);
        if (projectData.files && projectData.settings) {
          setFiles(projectData.files);
          setSettings(projectData.settings);
          setActiveFileId(projectData.files[0]?.id || DEFAULT_FILES[0].id);
          setLogs([]);
          setHasUnsavedChanges(false);
          setSaveStatus('Project imported');
        } else {
          alert('Invalid project file format.');
        }
      } catch (error) {
        alert('Error reading project file.');
        console.error(error);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };
  
  return (
    <div className="flex flex-col h-screen bg-[#0f1720] text-white">
      <Topbar 
        onNew={handleNewProject} 
        onSave={handleSaveProject} 
        onExport={handleExportProject} 
        onImport={handleImportProject}
        onSettings={() => setSettingsModalOpen(true)}
      />
      <main className="flex-grow grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <div className="flex flex-col h-full overflow-hidden">
          <EditorPanel
            files={files}
            activeFileId={activeFileId}
            onFileChange={handleFileChange}
            onFileSelect={setActiveFileId}
            settings={settings}
          />
        </div>
        <div className="flex flex-col h-full overflow-hidden border-l border-[#0f1624]">
          <div className="flex-grow"><PreviewPanel srcDoc={srcDoc} /></div>
          <Console logs={logs} onClear={() => setLogs([])} isOpen={isConsoleOpen} onToggle={() => setConsoleOpen(!isConsoleOpen)} />
        </div>
      </main>
      <StatusBar activeFileName={activeFile.name} saveStatus={saveStatus} />
      <SettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}

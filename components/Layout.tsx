import React, { useRef } from 'react';
import type { Settings, FileNode, Project } from '../types';
import { FileIcon, SaveIcon, ExportIcon, ImportIcon, SettingsIcon, MenuIcon, XIcon, GridIcon, TrashIcon } from './icons';

export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ReactNode; label: string; }> = ({ icon, label, ...props }) => (
    <button aria-label={label} title={label} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md text-[color:var(--muted)] bg-[color:var(--surface)] hover:bg-[color:var(--accent)] hover:text-[#0d1117] transition-colors duration-200" {...props}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
);

export const Topbar: React.FC<{ onNew: () => void; onSave: () => void; onExport: () => void; onImport: (e: React.ChangeEvent<HTMLInputElement>) => void; onSettings: () => void; onMenuClick: () => void; onSwitchProject: () => void; }> = ({ onNew, onSave, onExport, onImport, onSettings, onMenuClick, onSwitchProject }) => {
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
                <IconButton icon={<GridIcon className="h-4 w-4" />} label="Switch Project" onClick={onSwitchProject} />
                <IconButton icon={<SaveIcon className="h-4 w-4" />} label="Save" onClick={onSave} />
                <IconButton icon={<ExportIcon className="h-4 w-4" />} label="Export" onClick={onExport} />
                <input type="file" ref={importInputRef} onChange={onImport} accept=".json" className="hidden" />
                <IconButton icon={<ImportIcon className="h-4 w-4" />} label="Import" onClick={() => importInputRef.current?.click()} />
                <IconButton icon={<SettingsIcon className="h-4 w-4" />} label="Settings" onClick={onSettings} />
            </div>
        </header>
    );
};

export const StatusBar: React.FC<{ activeFile: FileNode | null; saveStatus: string; projectSize: string; getPath: () => string; }> = ({ activeFile, saveStatus, projectSize, getPath }) => {
    return (
        <div className="bg-[color:var(--editor-gutter)] text-xs text-[color:var(--muted)] px-4 py-1 flex justify-between items-center border-t border-[color:var(--surface)]">
            <div className="flex items-center gap-4"><span>Path: {getPath()}</span><span>Size: {projectSize}</span></div>
            <span>{saveStatus}</span>
        </div>
    );
};

export const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; settings: Settings; onSettingsChange: (s: Settings) => void; }> = ({ isOpen, onClose, settings, onSettingsChange }) => {
    if (!isOpen) return null;
    const handleChange = <K extends keyof Settings,>(field: K, value: Settings[K]) => onSettingsChange({ ...settings, [field]: value });
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-[color:var(--panel)] rounded-lg shadow-2xl p-6 w-full max-w-md border border-[color:var(--surface)]">
                <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold text-[color:var(--text)]">Settings</h2><button onClick={onClose} className="p-1 rounded-full hover:bg-[color:var(--surface)]"><XIcon className="h-5 w-5 text-[color:var(--muted)]" /></button></div>
                <div className="space-y-4 text-[color:var(--text)]">
                    <div><label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Theme</label><select value={settings.theme} onChange={(e) => handleChange('theme', e.target.value as 'dark' | 'light')} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"><option value="dark">Dark</option><option value="light">Light</option></select></div>
                    <div><label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Font Size: {settings.fontSize}px</label><input type="range" min="10" max="24" value={settings.fontSize} onChange={(e) => handleChange('fontSize', parseInt(e.target.value, 10))} className="w-full h-2 bg-[color:var(--surface)] rounded-lg appearance-none cursor-pointer accent-[color:var(--accent)]" /></div>
                    <div><label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Tab Size</label><input type="number" min="1" max="8" value={settings.tabSize} onChange={(e) => handleChange('tabSize', parseInt(e.target.value, 10))} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]" /></div>
                    <div><label className="block text-sm font-medium text-[color:var(--muted)] mb-1">Autosave</label><select value={settings.autosaveInterval} onChange={(e) => handleChange('autosaveInterval', parseInt(e.target.value, 10))} className="w-full bg-[color:var(--surface)] border border-[color:var(--surface)] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"><option value="0">Off</option><option value="5">5s</option><option value="10">10s</option><option value="30">30s</option></select></div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[color:var(--muted)]">Line Wrap</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.lineWrap} onChange={(e) => handleChange('lineWrap', e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-[color:var(--surface)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div></label></div>
                    <div className="flex items-center justify-between"><label className="text-sm font-medium text-[color:var(--muted)]">Allow External Resources</label><label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={settings.allowExternal} onChange={(e) => handleChange('allowExternal', e.target.checked)} className="sr-only peer" /><div className="w-11 h-6 bg-[color:var(--surface)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--accent)]"></div></label></div>
                </div>
            </div>
        </div>
    );
};

export const ProjectSelectorModal: React.FC<{ 
    isOpen: boolean; 
    projects: Project[]; 
    onLoad: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
}> = ({ isOpen, projects, onLoad, onNew, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-[color:var(--panel)] rounded-lg shadow-2xl p-6 w-full max-w-2xl border border-[color:var(--surface)] max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-[color:var(--text)]">Select Project</h2>
                    <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md text-[#0d1117] bg-[color:var(--accent)] hover:opacity-90 transition-opacity duration-200">
                        <FileIcon className="h-4 w-4" />
                        <span>New Project</span>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {projects.length > 0 ? (
                        <ul className="space-y-3">
                            {projects.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(p => (
                                <li key={p.id} className="bg-[color:var(--surface)] p-4 rounded-md flex justify-between items-center group transition-all hover:shadow-lg hover:border-[color:var(--accent)] border border-transparent">
                                    <div>
                                        <p className="font-bold text-lg text-[color:var(--text)]">{p.name}</p>
                                        <p className="text-xs text-[color:var(--muted)]">Last updated: {new Date(p.updatedAt).toLocaleString()}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                         <button onClick={() => onLoad(p.id)} className="px-4 py-2 text-sm font-semibold rounded-md text-[color:var(--text)] bg-transparent border border-[color:var(--surface)] hover:bg-[color:var(--accent)] hover:text-[#0d1117] transition-colors">Load</button>
                                         <button onClick={() => onDelete(p.id)} title={`Delete ${p.name}`} className="p-2 rounded-md hover:bg-red-500/20 text-red-400 opacity-50 group-hover:opacity-100 transition-opacity"><TrashIcon className="h-5 w-5" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-10 text-[color:var(--muted)]">
                            <p>No projects found.</p>
                            <p>Click "New Project" to get started.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
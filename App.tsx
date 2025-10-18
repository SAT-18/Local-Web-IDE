import React, { useState, useEffect, useCallback, useMemo, createContext } from 'react';
import type { Project, Settings, FileNode, FolderNode, Node, LogEntry } from './types';
import { SAMPLE_PROJECT, DEFAULT_SETTINGS } from './constants';
import * as storage from './core/storage';
import { useDebounce } from './hooks/useDebounce';

import { Topbar, StatusBar, SettingsModal, ProjectSelectorModal } from './components/Layout';
import { FileExplorer } from './components/FileExplorer';
import { EditorPanel, PreviewPanel, Console } from './components/Panels';

export const AppContext = createContext<{ project: Project | null }>({ project: null });

const id = (s = '') => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}${s}`;
const now = () => new Date().toISOString();

const findNodePath = (project: Project, nodeId: string): string => {
    let path = '';
    let currentNode = project.nodes[nodeId];
    if (!currentNode) return '/';
    while (currentNode) {
        path = `/${currentNode.name}${path}`;
        if (currentNode.parentId === null) break;
        currentNode = project.nodes[currentNode.parentId];
    }
    return path.replace('//', '/') || '/';
};

const getNodeRelativePath = (project: Project, nodeId: string): string => {
    const parts: string[] = [];
    let currentNode = project.nodes[nodeId];
    // Traverse up until we hit the root folder
    while (currentNode && currentNode.parentId && currentNode.parentId !== project.rootId) {
        parts.unshift(currentNode.name);
        currentNode = project.nodes[currentNode.parentId];
    }
    // Add the final part if it's not the root itself
    if (currentNode && currentNode.id !== project.rootId) {
        parts.unshift(currentNode.name);
    }
    return parts.join('/');
};


const getProjectSize = (project: Project) => {
    const size = Object.values(project.nodes).reduce((acc, node: Node) => {
        if (node.type === 'file') {
            const content = (node as FileNode).content || ''; // Defensive check
            return acc + new TextEncoder().encode(content).length;
        }
        return acc;
    }, 0);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const App: React.FC = () => {
    const [project, setProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [isExplorerVisible, setIsExplorerVisible] = useState(true);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isConsoleOpen, setIsConsoleOpen] = useState(true);
    const [previewKey, setPreviewKey] = useState(Date.now());

    const debouncedProject = useDebounce(project, settings.autosaveInterval > 0 ? settings.autosaveInterval * 1000 : 2000);

    // Initialization
    useEffect(() => {
        const init = async () => {
            const loadedSettings = await storage.loadSettings();
            setSettings(loadedSettings || DEFAULT_SETTINGS);

            const allProjects = await storage.getAllProjects();
            setProjects(allProjects);

            const lastProjectId = localStorage.getItem('last_project_id');
            let projectToLoad = lastProjectId ? await storage.loadProjectById(lastProjectId) : null;
            
            if (!projectToLoad && allProjects.length > 0) {
                projectToLoad = allProjects.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
            } else if (!projectToLoad && allProjects.length === 0) {
                projectToLoad = SAMPLE_PROJECT;
                await storage.saveProject(projectToLoad);
                setProjects([projectToLoad]);
            }

            if (projectToLoad) {
                setProject(projectToLoad);
                localStorage.setItem('last_project_id', projectToLoad.id);
                const htmlFile = Object.values(projectToLoad.nodes).find((n: Node) => n.type === 'file' && n.name.endsWith('.html'));
                setActiveFileId(htmlFile?.id ?? null);
            } else {
                setIsProjectSelectorOpen(true);
            }
        };
        init().catch(console.error);
    }, []);

    // Console message listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.source === 'preview-console') {
                const { type, data } = event.data;
                setLogs(prev => [...prev, { id: id(), type, timestamp: new Date().toLocaleTimeString(), data }]);
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Autosave
    useEffect(() => {
        if (debouncedProject && saveStatus === 'unsaved' && settings.autosaveInterval > 0) {
            handleSaveProject();
        }
    }, [debouncedProject, settings.autosaveInterval, saveStatus]);

    // Save settings
    useEffect(() => {
        storage.saveSettings(settings);
        document.documentElement.setAttribute('data-theme', settings.theme);
        document.documentElement.style.setProperty('--font-size', `${settings.fontSize}px`);
    }, [settings]);

    const handleSaveProject = useCallback(async () => {
        if (!project || saveStatus !== 'unsaved') return;
        setSaveStatus('saving');
        await storage.saveProject(project);
        setTimeout(() => setSaveStatus('saved'), 500);
    }, [project, saveStatus]);

    const handleFileChange = useCallback((id: string, content: string) => {
        setProject(p => {
            if (!p) return p;
            const node = p.nodes[id];
            if (node?.type !== 'file' || node.content === content) return p;
            
            const newNodes = { ...p.nodes, [id]: { ...node, content, updatedAt: now() } };
            return { ...p, nodes: newNodes, updatedAt: now() };
        });
        setSaveStatus('unsaved');
    }, []);

    const handleLoadProject = useCallback(async (projectId: string) => {
        const projectToLoad = await storage.loadProjectById(projectId);
        if (projectToLoad) {
            setProject(projectToLoad);
            localStorage.setItem('last_project_id', projectId);
            const htmlFile = Object.values(projectToLoad.nodes).find((n: Node) => n.type === 'file' && n.name.endsWith('.html'));
            setActiveFileId(htmlFile?.id ?? null);
            setIsProjectSelectorOpen(false);
            setSaveStatus('saved');
        }
    }, []);

    const handleNewProject = useCallback(async () => {
        const name = prompt("Enter project name:", `project-${id()}`);
        if (!name) return;
        const newId = id('proj');
        const newProject: Project = { ...SAMPLE_PROJECT, id: newId, name, createdAt: now(), updatedAt: now(), nodes: JSON.parse(JSON.stringify(SAMPLE_PROJECT.nodes))};
        newProject.nodes['root'] = {...newProject.nodes['root'], name:name};

        await storage.saveProject(newProject);
        const allProjects = await storage.getAllProjects();
        setProjects(allProjects);
        await handleLoadProject(newProject.id);
    }, [handleLoadProject]);

    const handleDeleteProject = useCallback(async (projectId: string) => {
        if (!window.confirm("Delete project permanently?")) return;
        await storage.deleteProject(projectId);
        const allProjects = await storage.getAllProjects();
        setProjects(allProjects);
        if (project?.id === projectId) {
            if (allProjects.length > 0) await handleLoadProject(allProjects[0].id);
            else setProject(null);
        }
    }, [project, handleLoadProject]);

    const handleNewFile = (parentId: string) => {
        const name = prompt("Enter file name:", "new-file.js");
        if (!name) return;
    
        setProject(p => {
            if (!p) return p;
    
            const parent = p.nodes[parentId];
            if (!parent || parent.type !== 'folder') {
                alert("Error: Cannot create file because the parent is not a folder.");
                return p;
            }
    
            const childrenIds = parent.childrenIds || [];
            if (childrenIds.some(id => p.nodes[id]?.name === name)) {
                alert(`Error: A file or folder named "${name}" already exists.`);
                return p;
            }
    
            const fileId = id('file');
            const file: FileNode = { id: fileId, name, type: 'file', parentId, content: '', createdAt: now(), updatedAt: now() };
            const newParent: FolderNode = { ...parent, childrenIds: [...childrenIds, fileId], updatedAt: now() };
            const newNodes = { ...p.nodes, [fileId]: file, [parentId]: newParent };
            
            setActiveFileId(fileId);
            setSaveStatus('unsaved');
            
            return { ...p, nodes: newNodes, updatedAt: now() };
        });
    };
    
    const handleNewFolder = (parentId: string) => {
        const name = prompt("Enter folder name:", "new-folder");
        if (!name) return;
    
        setProject(p => {
            if (!p) return p;
    
            const parent = p.nodes[parentId];
            if (!parent || parent.type !== 'folder') {
                alert("Error: Cannot create folder because the parent is not a folder.");
                return p;
            }
    
            const childrenIds = parent.childrenIds || [];
            if (childrenIds.some(id => p.nodes[id]?.name === name)) {
                alert(`Error: A file or folder named "${name}" already exists.`);
                return p;
            }
    
            const folderId = id('folder');
            const folder: FolderNode = { id: folderId, name, type: 'folder', parentId, childrenIds: [], createdAt: now(), updatedAt: now() };
            const newParent: FolderNode = { ...parent, childrenIds: [...childrenIds, folderId], updatedAt: now() };
            const newNodes = { ...p.nodes, [folderId]: folder, [parentId]: newParent };
            
            setSaveStatus('unsaved');
            
            return { ...p, nodes: newNodes, updatedAt: now() };
        });
    };

    const handleDeleteNode = (nodeId: string) => {
        if (!window.confirm("Delete this item and all its contents permanently?")) return;
        
        let shouldClearActiveFile = false;
        if (activeFileId) {
            const deletedIds = new Set<string>();
            const queue: string[] = [nodeId];
            const nodes = project!.nodes;

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                deletedIds.add(currentId);
                const node = nodes[currentId];
                if (node?.type === 'folder') {
                    queue.push(...(node.childrenIds || []));
                }
            }
            if (deletedIds.has(activeFileId)) {
                shouldClearActiveFile = true;
            }
        }

        setProject(p => {
            if (!p || nodeId === p.rootId) return p;
    
            const newNodes = { ...p.nodes };
            const queue: string[] = [nodeId];
            const parentId = p.nodes[nodeId]?.parentId;
    
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const node = newNodes[currentId];
                if (node?.type === 'folder') {
                    queue.push(...(node.childrenIds || []));
                }
                delete newNodes[currentId];
            }
    
            if (parentId && newNodes[parentId]?.type === 'folder') {
                const parent = newNodes[parentId] as FolderNode;
                const childrenIds = parent.childrenIds || [];
                newNodes[parentId] = { ...parent, childrenIds: childrenIds.filter(id => id !== nodeId), updatedAt: now() };
            }
            
            return { ...p, nodes: newNodes, updatedAt: now() };
        });

        if (shouldClearActiveFile) setActiveFileId(null);
        setSaveStatus('unsaved');
    };

    const handleExport = () => {
        if (!project) return;
        const dataStr = JSON.stringify(project, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${project.name}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const newProject = JSON.parse(event.target?.result as string) as Project;
                if (!newProject.id || !newProject.name || !newProject.nodes) throw new Error("Invalid project structure");
                await storage.saveProject(newProject);
                const allProjects = await storage.getAllProjects();
                setProjects(allProjects);
                await handleLoadProject(newProject.id);
            } catch (err) {
                console.error("Import failed:", err);
                alert("Error importing project: invalid file format.");
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    };

    const getPath = () => activeFileId && project ? findNodePath(project, activeFileId) : '/';
    const projectSize = useMemo(() => project ? getProjectSize(project) : '0 B', [project]);
    
    const srcDoc = useMemo(() => {
        if (!project) return '';
        const htmlNode = Object.values(project.nodes).find((n: Node) => n.type === 'file' && n.name === 'index.html' && n.parentId === project.rootId) as FileNode;
        if (!htmlNode) return '<h1>index.html not found in project root</h1>';

        const injectedScript = `
        <script>
            // Console override
            const _o = {}; 
            ['log', 'warn', 'error', 'info'].forEach(k => {
                _o[k] = console[k];
                console[k] = (...args) => {
                    _o[k](...args);
                    try {
                        window.parent.postMessage({ source: 'preview-console', type: k, data: JSON.parse(JSON.stringify(args)) }, '*');
                    } catch(e) {
                         window.parent.postMessage({ source: 'preview-console', type: k, data: ['[non-serializable object]'] }, '*');
                    }
                }
            });
            // Global error handler
            window.addEventListener('error', e => console.error(e.message, 'at', e.filename + ':' + e.lineno));
        </script>
        `;

        const htmlContent = htmlNode.content || '';
        let html = htmlContent.replace('</head>', `${injectedScript}</head>`);
        
        // Find and replace local asset paths
        html = html.replace(/(href|src)=["'](?!https?:\/\/)([^"']+)["']/g, (_, attr, rawPath) => {
            const path = rawPath.startsWith('./') ? rawPath.substring(2) : rawPath;
            
            const fileNode = Object.values(project.nodes).find((n: Node) => {
                if (n.type !== 'file') return false;
                const relativePath = getNodeRelativePath(project, n.id);
                return relativePath === path;
            }) as FileNode | undefined;

            if (fileNode) {
                const mimeType = fileNode.name.endsWith('.js') ? 'application/javascript'
                               : fileNode.name.endsWith('.css') ? 'text/css'
                               : 'text/plain';
                
                const content = fileNode.content || '';
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                return `${attr}="${url}"`;
            }
            return `${attr}="${rawPath}"`;
        });
        
        return html;
    }, [project, previewKey]);


    if (!project) {
        return (
            <>
                <div className="flex h-screen items-center justify-center bg-[#0d1117] text-[#e6edf3]">Loading IDE...</div>
                <ProjectSelectorModal isOpen={isProjectSelectorOpen} projects={projects} onLoad={handleLoadProject} onNew={handleNewProject} onDelete={handleDeleteProject} />
            </>
        );
    }

    return (
        <AppContext.Provider value={{ project }}>
            <div className={`theme-${settings.theme} flex flex-col h-screen font-sans bg-[color:var(--panel)] text-[color:var(--text)] text-[var(--font-size)]`}>
                <Topbar onSave={handleSaveProject} onExport={handleExport} onImport={handleImport} onSettings={() => setIsSettingsModalOpen(true)} onMenuClick={() => setIsExplorerVisible(!isExplorerVisible)} onSwitchProject={() => setIsProjectSelectorOpen(true)} onNew={() => {}}/>
                <main className="flex flex-grow overflow-hidden">
                    {isExplorerVisible && <FileExplorer activeFileId={activeFileId} onFileSelect={setActiveFileId} onNewFile={handleNewFile} onNewFolder={handleNewFolder} onDeleteNode={handleDeleteNode} />}
                    <div className="flex-grow flex flex-col min-w-0">
                        <div className="flex-grow flex overflow-hidden">
                            <div className="w-1/2 flex flex-col"><EditorPanel activeFileId={activeFileId} onFileChange={handleFileChange} settings={settings} /></div>
                            <div className="w-1/2 flex flex-col">
                                <div className="flex-grow"><PreviewPanel key={previewKey} srcDoc={srcDoc} /></div>
                                <Console logs={logs} onClear={() => setLogs([])} onReset={() => setPreviewKey(Date.now())} isOpen={isConsoleOpen} onToggle={() => setIsConsoleOpen(!isConsoleOpen)} />
                            </div>
                        </div>
                        <StatusBar activeFile={activeFileId ? project.nodes[activeFileId] as FileNode : null} saveStatus={saveStatus} projectSize={projectSize} getPath={getPath} />
                    </div>
                </main>
                <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} settings={settings} onSettingsChange={setSettings} />
                <ProjectSelectorModal isOpen={isProjectSelectorOpen} projects={projects} onLoad={handleLoadProject} onNew={handleNewProject} onDelete={handleDeleteProject} />
            </div>
        </AppContext.Provider>
    );
};

export default App;
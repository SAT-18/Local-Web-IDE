import React, { useState, useEffect, useContext } from 'react';
import type { Node, FolderNode, Project } from '../types';
import { FileIcon, TrashIcon, PlusIcon, FolderIcon, FolderOpenIcon, HtmlIcon, CssIcon, JsIcon } from './icons';
import { AppContext } from '../App';

const getFileExtension = (path: string) => path.split('.').pop()?.toLowerCase() ?? '';

const getFileIcon = (fileName: string) => {
    const extension = getFileExtension(fileName);
    const props = { className: "h-4 w-4 mr-2 flex-shrink-0" };
    switch (extension) {
        case 'html': return <HtmlIcon {...props} />;
        case 'css': return <CssIcon {...props} />;
        case 'js': case 'mjs': return <JsIcon {...props} />;
        default: return <FileIcon {...props} />;
    }
};


const FileSystemEntry: React.FC<{
  node: Node;
  level: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  onFileSelect: (id: string) => void;
  onNewFile: (parentId: string) => void;
  onNewFolder: (parentId: string) => void;
  onDeleteNode: (id: string) => void;
  onToggleFolder: (id: string) => void;
}> = ({ node, level, activeFileId, expandedFolders, onFileSelect, onNewFile, onNewFolder, onDeleteNode, onToggleFolder }) => {
  const getChildren = (project: Project, folderId: string) : Node[] => {
    const folder = project.nodes[folderId] as FolderNode | undefined;
    if (!folder || folder.type !== 'folder') return [];
    const childrenIds = folder.childrenIds || [];
    return childrenIds.map(id => project.nodes[id]).filter(Boolean).sort((a,b) => (a.type === 'folder' && b.type === 'file') ? -1 : (a.type === 'file' && b.type === 'folder') ? 1 : a.name.localeCompare(b.name));
  };
  
  const { project } = useContext(AppContext);
  if (!project) return null;

  if (node.type === 'folder') {
    const isExpanded = expandedFolders.has(node.id);
    return (
      <div>
        <div onClick={() => onToggleFolder(node.id)} className="flex items-center group p-1.5 text-sm rounded cursor-pointer transition-colors text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]" style={{ paddingLeft: `${level * 1 + 0.5}rem` }}>
          {isExpanded ? <FolderOpenIcon className="h-4 w-4 mr-2 flex-shrink-0" /> : <FolderIcon className="h-4 w-4 mr-2 flex-shrink-0" />}
          <span className="truncate flex-1 font-semibold">{node.name}</span>
           <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex items-center">
                <button onClick={(e) => { e.stopPropagation(); onNewFile(node.id); }} title="New File" className="p-1 rounded hover:bg-[color:var(--surface)] text-[color:var(--muted)]"><PlusIcon className="h-4 w-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onNewFolder(node.id); }} title="New Folder" className="p-1 rounded hover:bg-[color:var(--surface)] text-[color:var(--muted)]"><FolderIcon className="h-4 w-4" /></button>
                <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }} title={`Delete ${node.name}`} className="p-1 rounded hover:bg-red-500/20 text-red-400"><TrashIcon className="h-4 w-4" /></button>
           </div>
        </div>
        {isExpanded && (
          <div>
            {getChildren(project, node.id).map(childNode => (
              <FileSystemEntry key={childNode.id} node={childNode} level={level + 1} {...{ activeFileId, expandedFolders, onFileSelect, onNewFile, onNewFolder, onDeleteNode, onToggleFolder }} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return ( // File
    <div onClick={() => onFileSelect(node.id)} className={`flex items-center justify-between group p-1.5 text-sm rounded cursor-pointer transition-colors ${activeFileId === node.id ? 'bg-[color:var(--accent)] text-[#0d1117] font-bold' : 'text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--text)]'}`} style={{ paddingLeft: `${level * 1 + 0.5}rem` }}>
      <div className="flex items-center truncate flex-1">{getFileIcon(node.name)}<span className="truncate">{node.name}</span></div>
      <button onClick={(e) => { e.stopPropagation(); onDeleteNode(node.id); }} title={`Delete ${node.name}`} className="p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-red-500/20 text-red-400 flex-shrink-0"><TrashIcon className="h-4 w-4" /></button>
    </div>
  );
};


export const FileExplorer: React.FC<{ activeFileId: string | null; onFileSelect: (id: string) => void; onNewFile: (parentId: string) => void; onNewFolder: (parentId: string) => void; onDeleteNode: (id: string) => void; }> = ({ activeFileId, onFileSelect, onNewFile, onNewFolder, onDeleteNode }) => {
  const { project } = useContext(AppContext);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => new Set(project ? [project.rootId] : []));
  
  if (!project) return null;
  const rootNode = project.nodes[project.rootId] as FolderNode;

  useEffect(() => {
    if (activeFileId) {
      let currentNode = project.nodes[activeFileId];
      if (!currentNode) return;
      
      const newExpanded = new Set(expandedFolders);
      let needsUpdate = false;
      while (currentNode.parentId) {
        if (!newExpanded.has(currentNode.parentId)) {
          newExpanded.add(currentNode.parentId);
          needsUpdate = true;
        }
        currentNode = project.nodes[currentNode.parentId];
      }
      if (needsUpdate) {
        setExpandedFolders(newExpanded);
      }
    }
  }, [activeFileId, project.nodes, expandedFolders]);


  const handleToggleFolder = (id: string) => setExpandedFolders(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const getChildren = (folderId: string) : Node[] => {
    const folder = project.nodes[folderId] as FolderNode | undefined;
    if (!folder || folder.type !== 'folder') return [];
    const childrenIds = folder.childrenIds || [];
    return childrenIds.map(id => project.nodes[id]).filter(Boolean).sort((a,b) => (a.type === 'folder' && b.type === 'file') ? -1 : (a.type === 'file' && b.type === 'folder') ? 1 : a.name.localeCompare(b.name));
  };

  return (
    <div className="flex flex-col bg-[color:var(--editor-gutter)] w-60 p-2 border-r border-[color:var(--surface)] h-full">
      <div className="flex justify-between items-center mb-2 p-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[color:var(--muted)]">{project.name}</h3>
        <div>
          <button onClick={() => onNewFile(project.rootId)} title="New File" className="p-1 rounded hover:bg-[color:var(--surface)]"><PlusIcon className="h-4 w-4 text-[color:var(--muted)]" /></button>
          <button onClick={() => onNewFolder(project.rootId)} title="New Folder" className="p-1 rounded hover:bg-[color:var(--surface)]"><FolderIcon className="h-4 w-4 text-[color:var(--muted)]" /></button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto">
        {getChildren(rootNode.id).map(node => (
          <FileSystemEntry key={node.id} node={node} level={0} {...{ activeFileId, expandedFolders, onFileSelect, onNewFile, onNewFolder, onDeleteNode }} onToggleFolder={handleToggleFolder} />
        ))}
      </div>
    </div>
  );
};
import React, { useMemo, useContext, useEffect, useRef } from 'react';
import type { Settings, LogEntry, LogType, FileNode } from '../types';
import { RefreshCwIcon, TrashIcon, ChevronDownIcon } from './icons';
import { AppContext } from '../App';

import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';


const CodeEditor: React.FC<{
  file: FileNode;
  settings: Settings;
  onChange: (content: string) => void;
}> = ({ file, settings, onChange }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const getLanguageExtension = (filename: string) => {
      if (filename.endsWith('.js') || filename.endsWith('.mjs')) return javascript();
      if (filename.endsWith('.css')) return css();
      if (filename.endsWith('.html')) return html();
      return [];
    };

    const extensions = [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      drawSelection(),
      indentOnInput(),
      bracketMatching(),
      autocompletion(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      getLanguageExtension(file.name),
      ...(settings.lineWrap ? [EditorView.lineWrapping] : []),
      ...(settings.theme === 'dark' ? [oneDark] : []),
      EditorView.theme({
        '&': {
          fontSize: `${settings.fontSize}px`,
          height: '100%',
          outline: 'none',
        },
        '.cm-scroller': {
          fontFamily: 'var(--font-family)',
        },
        '.cm-gutters': {
          backgroundColor: 'var(--editor-gutter)',
          borderRight: '1px solid var(--surface)',
        },
        '.cm-content': {
            tabSize: settings.tabSize,
        },
        '.cm-activeLine, .cm-activeLineGutter': {
            backgroundColor: 'rgba(128, 128, 128, 0.1)',
        }
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
    ];

    const state = EditorState.create({
      doc: file.content || '',
      extensions,
    });

    const view = new EditorView({ state, parent: editorRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [file.id, settings]);

  useEffect(() => {
      const view = viewRef.current;
      const currentContent = file.content || '';
      if (view && view.state.doc.toString() !== currentContent) {
          view.dispatch({
              changes: { from: 0, to: view.state.doc.length, insert: currentContent }
          });
      }
  }, [file.content]);

  return <div ref={editorRef} className="flex-grow w-full bg-[color:var(--editor-bg)]" />;
};


export const EditorPanel: React.FC<{ activeFileId: string | null; onFileChange: (id: string, content: string) => void; settings: Settings; }> = ({ activeFileId, onFileChange, settings }) => {
  const { project } = useContext(AppContext);
  const activeFile = useMemo(() => {
    if (!project || !activeFileId) return null;
    const node = project.nodes[activeFileId];
    return node?.type === 'file' ? node : null;
  }, [project, activeFileId]);
  
  if (!activeFile) {
    return (
        <div className="flex flex-col bg-[color:var(--panel)] h-full items-center justify-center text-[color:var(--muted)]">
            <p>No file selected.</p>
            <p className="text-sm">Select a file from the explorer to begin editing.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col bg-[color:var(--panel)] h-full overflow-hidden">
      <div className="flex-shrink-0 p-2 bg-[color:var(--editor-gutter)] border-b border-[color:var(--surface)] text-sm text-[color:var(--muted)]">{activeFile.name}</div>
      <CodeEditor
        key={activeFile.id}
        file={activeFile}
        settings={settings}
        onChange={(content) => onFileChange(activeFile.id, content)}
      />
    </div>
  );
};

export const PreviewPanel: React.FC<{ srcDoc: string }> = ({ srcDoc }) => (
    <iframe srcDoc={srcDoc} title="preview" sandbox="allow-scripts allow-same-origin" className="w-full h-full bg-[color:var(--editor-bg)] border-none" />
);

export const Console: React.FC<{ logs: LogEntry[]; onClear: () => void; onReset: () => void; isOpen: boolean; onToggle: () => void; }> = ({ logs, onClear, onReset, isOpen, onToggle }) => {
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
                             {log.data.map((d, i) => <span key={i} className="mr-2">{typeof d === 'object' ? JSON.stringify(d, null, 2) : String(d)}</span>)}
                         </div>
                     </div>
                 ))}
                 {logs.length === 0 && <p className="text-[color:var(--muted)]">No logs — run your code to see output.</p>}
             </div>
            )}
        </div>
    );
};
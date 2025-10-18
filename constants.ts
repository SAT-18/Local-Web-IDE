import type { Project, Settings } from './types';

const now = () => new Date().toISOString();
const id = (s = '') => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}${s}`;

export const SAMPLE_PROJECT: Project = {
  id: id('proj'),
  name: 'my-first-project',
  createdAt: now(),
  updatedAt: now(),
  rootId: 'root',
  nodes: {
    'root': {
      id: 'root',
      name: 'My Project',
      type: 'folder',
      parentId: null,
      childrenIds: ['index.html', 'src', 'style.css'],
      createdAt: now(),
      updatedAt: now(),
    },
    'index.html': {
      id: 'index.html',
      name: 'index.html',
      type: 'file',
      parentId: 'root',
      content: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>My First App</title>
  </head>
  <body>
    <div id="app">Hello world</div>
  </body>
</html>`,
      createdAt: now(),
      updatedAt: now(),
    },
    'style.css': {
      id: 'style.css',
      name: 'style.css',
      type: 'file',
      parentId: 'root',
      content: `body{font-family:system-ui, -apple-system, "Segoe UI"; background:#0d1117;color:#e6edf3;padding:24px}`,
      createdAt: now(),
      updatedAt: now(),
    },
    'src': {
      id: 'src',
      name: 'src',
      type: 'folder',
      parentId: 'root',
      childrenIds: ['app.js'],
      createdAt: now(),
      updatedAt: now(),
    },
    'app.js': {
      id: 'app.js',
      name: 'app.js',
      type: 'file',
      parentId: 'src',
      content: `console.log('app.js running');
document.getElementById('app')?.append(' — powered by SAT18 Local IDE');`,
      createdAt: now(),
      updatedAt: now(),
    },
  },
};


export const DEFAULT_SETTINGS: Settings = {
  fontSize: 14,
  autosaveInterval: 5, // 5 seconds
  lineWrap: true,
  theme: 'dark',
  tabSize: 2,
  allowExternal: false,
};

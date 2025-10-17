import type { ProjectFile, Settings } from './types';

export const DEFAULT_HTML = `<h1>Hello, SAT18!</h1>
<p>This is your monorepo-ready local web IDE.</p>
<button id="greet-btn">Click me</button>
`;

export const DEFAULT_CSS = `body {
  font-family: 'JetBrains Mono', sans-serif;
  background-color: #0d1117;
  color: #e6edf3;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
  flex-direction: column;
  text-align: center;
}

button {
  margin-top: 1rem;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  background-color: var(--accent);
  color: #0d1117;
  font-weight: bold;
  border: none;
  border-radius: 5px;
  transition: transform 0.2s, background-color 0.3s;
}

button:hover {
    background-color: #38d9ff;
    transform: scale(1.05);
}
`;

export const DEFAULT_JS = `console.log("Welcome to your Monorepo-ready IDE!");

function greet() {
  const name = prompt("What's your name?");
  if (name) {
    alert("Hello, " + name + "!");
    console.log("Greeted: " + name);
  } else {
    console.warn("User cancelled the prompt.");
  }
}

document.getElementById('greet-btn')?.addEventListener('click', greet);
`;

export const DEFAULT_FILES: ProjectFile[] = [
  { id: 'html-default', path: 'public/index.html', content: DEFAULT_HTML },
  { id: 'css-default', path: 'src/styles/main.css', content: DEFAULT_CSS },
  { id: 'js-default', path: 'src/app.js', content: DEFAULT_JS },
];

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 14,
  autosaveInterval: 5, // 5 seconds
  lineWrap: true,
  theme: 'dark',
  tabSize: 2,
  allowExternal: false,
};
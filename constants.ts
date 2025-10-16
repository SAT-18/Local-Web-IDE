
import type { ProjectFile, Settings } from './types';

export const DEFAULT_HTML = `<h1>Hello, World!</h1>
<p>This is your local web IDE.</p>
<button onclick="greet()">Click me</button>
`;

export const DEFAULT_CSS = `body {
  font-family: sans-serif;
  background-color: #f0f0f0;
  color: #333;
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
  background-color: #7c5cff;
  color: white;
  border: none;
  border-radius: 5px;
  transition: background-color 0.3s;
}

button:hover {
    background-color: #6a4ff9;
}
`;

export const DEFAULT_JS = `console.log("Welcome to the console!");

function greet() {
  const name = prompt("What's your name?");
  if (name) {
    alert("Hello, " + name + "!");
    console.log("Greeted: " + name);
  } else {
    console.warn("User cancelled the prompt.");
  }
}
`;

export const DEFAULT_FILES: ProjectFile[] = [
  { id: 'html-default', name: 'index.html', type: 'html', content: DEFAULT_HTML },
  { id: 'css-default', name: 'style.css', type: 'css', content: DEFAULT_CSS },
  { id: 'js-default', name: 'script.js', type: 'javascript', content: DEFAULT_JS },
];

export const DEFAULT_SETTINGS: Settings = {
  fontSize: 14,
  autosaveInterval: 5, // 5 seconds
  lineWrap: true,
};

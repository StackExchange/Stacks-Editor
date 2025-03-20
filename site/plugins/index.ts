import { japaneseSEPlugin } from "./japanese-se";
import { mermaidPlugin } from "./mermaid";
import { sillyPlugin } from "./silly-effects";
import { codeDetectionPlugin } from "./code-detection";
import { markdownLogging } from "./markdown-logging";

export const samplePlugins = [
    japaneseSEPlugin,
    mermaidPlugin,
    sillyPlugin,
    codeDetectionPlugin,
];

export const devxPlugins = [markdownLogging];

import { japaneseSEPlugin } from "./japanese-se";
import { sillyPlugin } from "./silly-effects";
import { codeDetectionPlugin } from "./code-detection";
import { markdownLogging } from "./markdown-logging";

export const samplePlugins = [
    japaneseSEPlugin,
    sillyPlugin,
    codeDetectionPlugin,
];

export const devxPlugins = [markdownLogging];

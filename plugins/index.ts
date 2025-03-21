import { japaneseSEPlugin } from "./japanese-se";
import { mermaidPlugin } from "./mermaid";
import { sillyPlugin } from "./silly-effects";
import { codeDetectionPlugin } from "./code-detection";
import { markdownLogging } from "./markdown-logging";
import {stackSnippetExternal} from "./stack-snippets/stack-snippet-external";

/**
 * Plugins written to demonstrate potential capabilities of plugins.
 * These are only available on the /plugins playground
 * */
export const samplePlugins = [
    japaneseSEPlugin,
    mermaidPlugin,
    sillyPlugin,
    codeDetectionPlugin,
];

/**
 * Plugins written and maintained by Stack developers, intended for production deployment.
 */
export const firstPartyPlugins = [
    stackSnippetExternal
];

/**
 * Plugins written to aid with the development experience.
 */
export const devxPlugins = [markdownLogging];

import hljs, { type HLJSApi } from "highlight.js";

/* eslint-disable @typescript-eslint/ban-ts-comment */
/*
 * NOTE: This file is only for local development / generic bundles
 * The prod/stackoverflow build configs completely remove highlight.js from the bundle,
 * expecting it to be supplied globally as `window.hljs`, already configured and ready to go
 */

export function getHljsInstance(): HLJSApi {
    // @ts-expect-error
    const hljsInstance: HLJSApi = (globalThis.hljs as HLJSApi) ?? hljs;

    return hljsInstance && hljsInstance.highlight ? hljsInstance : null;
}

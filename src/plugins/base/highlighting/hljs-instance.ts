import type { HLJSApi } from "highlight.js";

/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/ban-ts-comment */
/*
 * NOTE: This file is only for local development / generic bundles
 * The prod/stackoverflow build configs completely remove highlight.js from the bundle,
 * expecting it to be supplied globally as `window.hljs`, already configured and ready to go
 */

/** Attempts to get the optional highlight.js instance */
export function getHljsInstance(): HLJSApi {
    // @ts-expect-error
    let hljs: HLJSApi = global.hljs as HLJSApi;

    if (!hljs) {
        try {
            hljs = require("highlight.js") as HLJSApi;
        } catch {
            // Failed to import optional dependency. Do nothing :)
        }
    }

    return hljs && hljs.highlight ? hljs : null;
}

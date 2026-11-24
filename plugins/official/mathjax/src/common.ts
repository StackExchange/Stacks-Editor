/** A pair of opening and closing MathJax delimiters. */
export type MathJaxDelimiter = readonly [open: string, close: string];

/** Information passed to the host application when a formula should render. */
export interface MathJaxRenderRequest {
    /** Element owned by the editor that should contain the rendered formula. */
    container: HTMLElement;
    /** TeX source without its surrounding delimiters. */
    source: string;
    /** Whether the formula uses display rather than inline layout. */
    display: boolean;
}

/** Options used by the official MathJax editor plugin. */
export interface MathJaxOptions {
    /** Delimiters recognized as inline formulas. */
    inlineDelimiters?: readonly MathJaxDelimiter[];
    /** Delimiters recognized as display formulas. */
    displayDelimiters?: readonly MathJaxDelimiter[];
    /** Host callback that renders a formula into the supplied container. */
    renderer?: (request: MathJaxRenderRequest) => void | Promise<void>;
    /** Host callback that clears renderer-owned state from a container. */
    clear?: (container: HTMLElement) => void | Promise<void>;
}

/** Default inline delimiters supported by Stack Exchange MathJax. */
export const defaultInlineDelimiters: readonly MathJaxDelimiter[] = [
    ["$", "$"],
    ["\\(", "\\)"],
];

/** Default display delimiters supported by Stack Exchange MathJax. */
export const defaultDisplayDelimiters: readonly MathJaxDelimiter[] = [
    ["$$", "$$"],
    ["\\[", "\\]"],
];

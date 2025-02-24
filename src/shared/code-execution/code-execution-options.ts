//TODO: Type the source language to ones we support execution for
type SourceLanguage = string;

/** Execution context for a snippet - a language and block of source code */
interface SnippetExecutionContext {
    /** Language the source code will be compiled in */
    compilerLanguage: SourceLanguage;
    source: string;
}

/** A single attachment that will be loaded in a multi-file context */
interface SourceAttachment {
    /** Name of the file within execution context */
    file: string
    /** Folder structure where the file is found in execution context */
    filepath: string;
    /** Contents of the file */
    source: string;
}

/** Execution context for multiple files - a language and a file/folder structure */
interface MultifileExecutionContext {
    compilerLanguage: SourceLanguage;
    files: SourceAttachment[]
}

type ExecutionContext = SnippetExecutionContext | MultifileExecutionContext;

export interface CodeExecutionProvider {
    /** Responsible for submitting the code for execution, returning a URL to get the results */
    submissionHandler: (context: ExecutionContext) => Promise<string>;
}

export function isSnippetContext(context: ExecutionContext): context is SnippetExecutionContext {
    const snippet = context as SnippetExecutionContext;
    return snippet.source !== undefined && typeof snippet.source == "string";
}

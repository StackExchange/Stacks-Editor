import { Schema } from "prosemirror-model";
import { ExternalPluginProvider, richTextSchemaSpec } from "../../../../src";
import { MathJaxOptions } from "../src/common";
import { mathJaxPlugin } from "../src/mathJaxPlugin";

/** Construct an external plugin provider containing only MathJax. */
export const mathJaxExternalProvider = (options?: MathJaxOptions) =>
    new ExternalPluginProvider([mathJaxPlugin(options)], {});

/** Construct the rich-text schema extended by the MathJax plugin. */
export const buildMathJaxSchema = (options?: MathJaxOptions) => {
    const provider = mathJaxExternalProvider(options);
    return new Schema(provider.getFinalizedSchema(richTextSchemaSpec));
};

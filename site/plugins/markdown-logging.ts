import type { EditorPlugin } from "../../src";
import { log } from "../../src/shared/logger";

/**
 * Adds the ability to configure logging for the parser stages.
 * This allows for easier development of markdown-it parsers, including
 *  debugging of rules (e.g. "Why is my new rule not being executed?")
 *  and unexpected states (e.g. "Why is my rule doing nothing with the current token state?")
 *
 *  Core rules do not run silently, and are each always run; so we log the token stream after each rule.
 *  Block and Inline rules log before each rule is executed, as the rule chain stops being executed when a rule successfully transforms the block (e.g. returns true when not in silent mode)
 * */
export const markdownLogging: EditorPlugin = () => ({
    markdown: {
        parser: {},
        serializers: {
            nodes: {},
            marks: {},
        },
        alterMarkdownIt: (mdit) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore This is a hack to get at the underbelly of the rule engine
            const coreRules = (
                mdit.core.ruler.__rules__ as {
                    name: string;
                }[]
            ).map((r) => r.name);
            for (let i = 0; i < coreRules.length; i++) {
                mdit.core.ruler.after(coreRules[i], "logState", (state) => {
                    log(
                        `mdit core - ${coreRules[i]}`,
                        JSON.parse(JSON.stringify(state.tokens))
                    );
                });
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore This is a hack to get at the underbelly of the rule engine
            const blockRules = (
                mdit.block.ruler.__rules__ as {
                    name: string;
                }[]
            ).map((r) => r.name);
            for (let i = 0; i < blockRules.length; i++) {
                mdit.block.ruler.before(
                    blockRules[i],
                    "logState",
                    (state, start, end, silent) => {
                        if (!silent) {
                            log(
                                `mdit block - ${blockRules[i]}`,
                                JSON.parse(
                                    JSON.stringify({
                                        start,
                                        end,
                                        tokens: state.tokens,
                                    })
                                )
                            );
                        }
                        return false;
                    }
                );
            }

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore This is a hack to get at the underbelly of the rule engine
            const inlineRules = (
                mdit.inline.ruler.__rules__ as {
                    name: string;
                }[]
            ).map((r) => r.name);
            for (let i = 0; i < inlineRules.length; i++) {
                mdit.inline.ruler.before(
                    inlineRules[i],
                    "logState",
                    (state, silent) => {
                        if (!silent) {
                            log(
                                `mdit inline - ${inlineRules[i]}`,
                                JSON.parse(JSON.stringify(state.tokens))
                            );
                        }
                        return false;
                    }
                );
            }
        },
    },
});

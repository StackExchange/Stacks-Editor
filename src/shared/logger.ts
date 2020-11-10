// eslint disables needed to ensure we don't spam the console in production/test environments
/* eslint-disable no-console, no-process-env */

// env variables set by webpack (or jest) based on the build mode
const isDevelopment = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

/**
 * Styles text to be used as a "header" in the console
 * @param text The text to stype
 */
function styleHeaderText(text: string, preface = "") {
    if (!text) {
        return [];
    }
    return ["%c" + preface + text, "font-weight: bold;"];
}

/**
 * Logs a message to the console with a styled "header" (development only)
 * @param header The header of the log which will be styled to stand out
 * @param message Any items to log in the message
 */
export function log(header: string, ...message: unknown[]): void {
    if (!isDevelopment) {
        return;
    }

    console.log.apply(console, [
        ...styleHeaderText(header, "[DEBUG] "),
        ...message,
    ]);
}

/**
 * Logs an error to the console with a styled "header" (both development and prod)
 * @param header The header of the log which will be styled to stand out
 * @param error Any items to log in the error
 */
export function error(header: string, ...error: unknown[]): void {
    // don't spam up our test output
    if (isTest) {
        return;
    }

    console.error.apply(console, [...styleHeaderText(header), ...error]);
}

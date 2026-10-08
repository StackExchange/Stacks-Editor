import { readFileSync } from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";
import semver from "semver";

export function validateV0Version(version) {
    const parsedVersion = semver.parse(version);

    if (parsedVersion === null || parsedVersion.major !== 0) {
        throw new Error(
            `The package version "${version}" is outside the supported 0.x.x release line.`
        );
    }

    return version;
}

if (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    try {
        const packageJson = JSON.parse(
            readFileSync(new URL("../package.json", import.meta.url), "utf8")
        );
        validateV0Version(packageJson.version);
    } catch (error) {
        process.stderr.write(`${error.message}\n`);
        process.exitCode = 1;
    }
}

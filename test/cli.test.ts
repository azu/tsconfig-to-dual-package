import * as fs from "fs";
import * as path from "path";
import * as assert from "assert";
import url from "node:url";

const __filename__ = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename__);
import { run } from "../src/cli.js";

const fixturesDir = path.join(__dirname, "snapshots");
const EXCLUDES = ["output.txt"];
const createTree = (dir: string, indent = 0, output = "") => {
    fs.readdirSync(dir, {
        withFileTypes: true
    }).forEach((dirent) => {
        if (dirent.isDirectory()) {
            const res = path.resolve(dir, dirent.name);
            output += " ".repeat(indent) + dirent.name + "/" + "\n";
            output = createTree(res, indent + 2, output);
        } else if (dirent.isFile()) {
            if (!EXCLUDES.includes(dirent.name)) {
                output += " ".repeat(indent) + dirent.name + "\n";
            }
        }
    });
    return output;
};
describe("Snapshot testing", () => {
    fs.readdirSync(fixturesDir).map((caseName) => {
        const normalizedTestName = caseName.replace(/-/g, " ");
        it(`Test ${normalizedTestName}`, async function () {
            const fixtureDir = path.join(fixturesDir, caseName);
            let result: { exitStatus: number; stdout: string | null; stderr: Error | null };
            try {
                /**
                 * "input":[ ... ]
                 * "flags": {}
                 */
                const options = fs.existsSync(path.join(fixtureDir, "options.json"))
                    ? JSON.parse(fs.readFileSync(path.join(fixtureDir, "options.json"), "utf-8"))
                    : {};
                result = await run({
                    positionals: options.input,
                    values: {
                        ...options.flags,
                        cwd: fixtureDir,
                        help: false
                    }
                });
            } catch (e) {
                console.log(e);
                assert.ok(caseName.startsWith("ng."), "ok case should not throw an error:" + normalizedTestName);
                return;
            }
            assert.strictEqual(
                result.exitStatus,
                caseName.startsWith("ok.") ? 0 : 1,
                "Exit status should be 0 for ok tests and 1 for error tests"
            );
            const actualDump = createTree(fixtureDir);
            const expectedFilePath = path.join(fixtureDir, "output.txt");
            // Usage: update snapshots
            // UPDATE_SNAPSHOT=1 npm test
            if (!fs.existsSync(expectedFilePath) || process.env.UPDATE_SNAPSHOT) {
                fs.writeFileSync(expectedFilePath, actualDump);
                this.skip(); // skip when updating snapshots
                return;
            }
            // compare input and output
            const expectedContent = fs.readFileSync(expectedFilePath, "utf-8");
            assert.deepStrictEqual(actualDump, expectedContent);
        });
    });
});

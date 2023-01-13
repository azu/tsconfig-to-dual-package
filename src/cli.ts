import { parseArgs } from "node:util";
import { tsconfigToDualPackages } from "./tsconfig-to-dual-package.js";

export const cli = parseArgs({
    strict: true,
    allowPositionals: true,
    options: {
        cwd: {
            type: "string",
            default: process.cwd()
        }
    }
});

export const run = async (
    _input = cli.positionals,
    flags = cli.values
): Promise<{ exitStatus: number; stdout: string | null; stderr: Error | null }> => {
    await tsconfigToDualPackages({
        cwd: flags.cwd ?? process.cwd()
    });
    return {
        stdout: null,
        stderr: null,
        exitStatus: 0
    };
};

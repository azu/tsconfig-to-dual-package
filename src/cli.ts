import { parseArgs } from "node:util";
import { tsconfigToDualPackages } from "./tsconfig-to-dual-package.js";

const HELP = `
    Usage
      $ tsconfig-to-dual-package [Option] <tsconfig.json>
 
    Options
      --cwd                 [String] current working directory. Default: process.cwd()
      --help                [Boolean] show help

    Examples
      # Find tsconfig*.json in cwd and convert to dual package
      $ tsconfig-to-dual-package
      # Convert specified tsconfig.json to dual package
      $ tsconfig-to-dual-package ./config/tsconfig.json

`;
export const createCli = () => {
    return parseArgs({
        strict: true,
        allowPositionals: true,
        options: {
            cwd: {
                type: "string",
                default: process.cwd()
            },
            help: {
                type: "boolean",
                alias: "h"
            }
        }
    });
};

export const run = async (
    cli = createCli()
): Promise<{ exitStatus: number; stdout: string | null; stderr: Error | null }> => {
    if (cli.values.help) {
        return { exitStatus: 0, stdout: HELP, stderr: null };
    }
    await tsconfigToDualPackages({
        targetTsConfigFilePaths: cli.positionals,
        cwd: cli.values.cwd ?? process.cwd()
    });
    return {
        stdout: null,
        stderr: null,
        exitStatus: 0
    };
};

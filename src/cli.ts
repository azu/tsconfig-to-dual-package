import { parseArgs } from "node:util";
import { tsconfigToDualPackages, TSConfigDualPackageOptions } from "./tsconfig-to-dual-package.js";

const HELP = `
    Usage
      $ tsconfig-to-dual-package [Option] <tsconfig.json>
 
    Options
      --cwd                 [String] current working directory. Default: process.cwd()
      --debug               [Boolean] Enable debug output
      --help                [Boolean] show help

    Examples
      # Find tsconfig*.json in cwd and convert to dual package
      $ tsconfig-to-dual-package
      # Convert specified tsconfig.json to dual package
      $ tsconfig-to-dual-package ./config/tsconfig.esm.json ./config/tsconfig.cjs.json

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
            },
            debug: {
                type: "boolean",
                default: false
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
    const options: TSConfigDualPackageOptions = {
        targetTsConfigFilePaths: cli.positionals,
        cwd: cli.values.cwd ?? process.cwd(),
        debug: cli.values.debug
    };
    await tsconfigToDualPackages(options);
    return {
        stdout: null,
        stderr: null,
        exitStatus: 0
    };
};

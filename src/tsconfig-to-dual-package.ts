import fs from "node:fs/promises";
import path from "node:path";
import { resolveTsConfig } from "resolve-tsconfig";
import ts from "typescript";

export const findTsConfig = async ({
    targetTsConfigFilePaths,
    cwd
}: {
    targetTsConfigFilePaths?: string[];
    cwd: string;
}) => {
    if (targetTsConfigFilePaths && targetTsConfigFilePaths.length >= 0) {
        return targetTsConfigFilePaths.map((value) => {
            return path.resolve(cwd, value);
        });
    }
    const dirents = await fs.readdir(cwd, { withFileTypes: true });
    // ok: tsconfig.json
    // ok: tsconfig.cjs.json
    // ok: tsconfig-cjs.json
    // ng: cjs-tsconfig.json
    // ng: tsconfig.json.cjs
    return dirents
        .filter((dirent) => {
            // remove non-tsconfig.json
            return path.extname(dirent.name) === ".json" && dirent.name.startsWith("tsconfig");
        })
        .map((dirent) => {
            return path.join(cwd, dirent.name);
        });
};
export const createModuleTypePackage = async ({ cwd, type }: { cwd: string; type: "module" | "commonjs" }) => {
    try {
        const basePkg = JSON.parse(await fs.readFile(path.resolve(cwd, "package.json"), "utf-8"));
        return {
            ...basePkg,
            type
        };
    } catch (e) {
        throw new Error("Failed to read package.json", {
            cause: e
        });
    }
};

export type RequiredTsConfigOptions = { compilerOptions: { outDir: string; module: "ESNext" } };
export const getOutDirFromTsConfig = async (tsconfig: RequiredTsConfigOptions, tsconfigFilePath?: string) => {
    const outDir = tsconfig?.compilerOptions?.outDir;
    if (!outDir) {
        throw new Error("Failed to find outDir in tsconfig.json " + tsconfigFilePath);
    }
    return outDir;
};

const getModuleType = (moduleKind: ts.ModuleKind) => {
    // TODO: get more better way
    if (moduleKind >= ts.ModuleKind.ES2015 && moduleKind <= ts.ModuleKind.ESNext) {
        return "module";
    } else if (moduleKind === ts.ModuleKind.CommonJS) {
        return "commonjs";
    }
    throw new Error("Non-support module kind: " + moduleKind);
};
export const tsconfigToDualPackages = async ({
    targetTsConfigFilePaths,
    cwd
}: {
    targetTsConfigFilePaths?: string[];
    cwd: string;
}) => {
    // search tsconfig*.json
    const tsconfigFilePaths = await findTsConfig({ targetTsConfigFilePaths, cwd });
    // load tsconfig.json
    const tsconfigs = await Promise.all(
        tsconfigFilePaths.map(async (tsconfigFilePath) => {
            return resolveTsConfig({ filePath: tsconfigFilePath });
        })
    );
    // create package.json for dual package
    const dualPackages = await Promise.all(
        tsconfigs.map(async (tsconfig) => {
            if (tsconfig.diagnostics || !tsconfig.config) {
                console.error(tsconfig.diagnostics, tsconfig.config);
                throw new Error("Failed to parse tsconfig.json");
            }
            if (!tsconfig.config.options.outDir) {
                throw new Error(`Failed to find "outDir" option in tsconfig.json`);
            }
            if (!tsconfig.config.options.module) {
                throw new Error(`Failed to find "module" option in tsconfig.json`);
            }
            return {
                outDir: tsconfig.config.options.outDir,
                pkg: await createModuleTypePackage({
                    cwd,
                    type: getModuleType(tsconfig.config.options.module)
                })
            };
        })
    );
    // write to <outDir>/package.json
    await Promise.all(
        dualPackages.map(async (dualPackage) => {
            const { outDir, pkg } = await dualPackage;
            await fs.writeFile(path.resolve(cwd, outDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
        })
    );
};

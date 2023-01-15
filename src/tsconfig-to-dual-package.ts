import fs from "node:fs/promises";
import path from "node:path";
import { resolveTsConfig } from "resolve-tsconfig";
import ts from "typescript";

const formatDiagnostics = (diagnostics: ts.Diagnostic[]): string => {
    return diagnostics
        .map((diagnostic) => {
            if (diagnostic.file) {
                const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
                return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
            } else {
                return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            }
        })
        .join("\n");
};

export type TSConfigDualPackageOptions = {
    targetTsConfigFilePaths?: string[];
    cwd: string;
};
export const findTsConfig = async ({ targetTsConfigFilePaths, cwd }: TSConfigDualPackageOptions) => {
    if (targetTsConfigFilePaths && targetTsConfigFilePaths.length > 0) {
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
    // if the field has relative path, it should not be included in generated package.json
    // because it is different relative path from the package.json
    // https://docs.npmjs.com/cli/v9/configuring-npm/package-json
    // https://nodejs.org/api/packages.html#community-conditions-definitions
    const OMIT_FIELDS = ["main", "module", "browser", "types", "exports"];
    try {
        const basePkg = JSON.parse(await fs.readFile(path.resolve(cwd, "package.json"), "utf-8"));
        const filteredPkg = Object.fromEntries(Object.entries(basePkg).filter(([key]) => !OMIT_FIELDS.includes(key)));
        return {
            ...filteredPkg,
            type
        };
    } catch (e) {
        console.error("Failed to create package.json", {
            cwd,
            type,
            error: e
        });
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
export const tsconfigToDualPackages = async ({ targetTsConfigFilePaths, cwd }: TSConfigDualPackageOptions) => {
    // search tsconfig*.json
    const tsconfigFilePaths = await findTsConfig({ targetTsConfigFilePaths, cwd });
    // load tsconfig.json
    const tsconfigs = await Promise.all(
        tsconfigFilePaths.map(async (tsconfigFilePath) => {
            return {
                filePath: tsconfigFilePath,
                tsconfig: await resolveTsConfig({ filePath: tsconfigFilePath })
            };
        })
    );
    // create package.json for dual package
    const dualPackages = await Promise.all(
        tsconfigs.map(async ({ filePath, tsconfig }) => {
            if (tsconfig.diagnostics || !tsconfig.config) {
                console.error(`Failed to load tsconfig: ${filePath}

${formatDiagnostics(tsconfig.diagnostics)}
`);

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
            await fs.mkdir(path.resolve(cwd, outDir), { recursive: true });
            await fs.writeFile(path.resolve(cwd, outDir, "package.json"), JSON.stringify(pkg, null, 2), "utf-8");
        })
    );
};

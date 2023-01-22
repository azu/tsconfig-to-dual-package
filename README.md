# tsconfig-to-dual-package

A Node.js dual package tool for TypeScript.

You can support CommonJS and ESModules in one package via this tool.
This tool add `package.json` which is `{ "type": "module" }` or `{ "type": "commonjs" }` based on tsconfig's `module` and `outDir` option.

You can use this tool with `tsc` command.

```bash
$ tsc -p . && tsc -p ./tsconfig.cjs.json && tsconfig-to-dual-package # add "{ourDir}/package.json"
````

## Install

Install with [npm](https://www.npmjs.com/):

    npm install tsconfig-to-dual-package --save-dev

Requirements: This tool depended on `typescript` package for parsing `tsconfig.json` file.
It means that You need to install `typescript` as devDependencies in your project.

- PeerDependency:
  - `typescript`: `*` (any version)
- Node.js v16.17.0+

## Usage


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


## How it works

This tool adds `package.json` to tsconfig's `outDir` for dual package.
Each generated `package.json` has `type` field that is `commonjs` or `module`.

You can see example repository in following:

- [tsconfig-to-dual-package-example](https://github.com/azu/tsconfig-to-dual-package-example)

For example, This project `package.json` is following:

```json5
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./lib/index.js",
  "types": "./lib/index.d.ts",
  "module": "./module/index.js",
  // Note: Normally same .js extension can not be used as dual package
  //      but this tool add custom `package.json` to each outDir(=lib/, module/) and resolve it.
  "exports": {
    ".": {
      "import": {
        "types": "./module/index.d.ts",
        "default": "./module/index.js"
      },
      "require": {
        "types": "./lib/index.d.ts",
        "default": "./lib/index.js"
      },
      "default": "./lib/index.js"
    }
  }
}
```

And, This project has `tsconfig.json` and `tsconfig.cjs.json`:

`tsconfig.json`: for ES Module

```json5
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "newLine": "LF",
    "outDir": "./module/",  // <= Output ESM to `module` directory
    "target": "ES2018",
    "strict": true,
  },
  "include": [
    "**/*"
  ]
}
```

`tsconfig.cjs.json`: for CommonJS

```json5
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./cjs/" // <= Output CommonJS to `cjs` directory
  },
  "include": [
    "**/*"
  ]
}
```

Then, You can run `tsconfig-to-dual-package` after you compile both CommonJS and ES Module with following command:

```json5
{
  "scripts": {
    "build": "tsc -p ./tsconfig.json && tsc -p ./tsconfig.cjs.json && tsconfig-to-dual-package",
  }
}
```

`tsconfig-to-dual-package` command adds `package.json` to `module` and `cjs` directory.

As a result, you can publish both CommonJS and ESModule in a single package. It is called [dual package](https://nodejs.org/api/packages.html#dual-commonjses-module-packages).

```markdown
- package.json          // { "type": "module" }
- index.ts              // Node.js treat this as ESModule
- tsconfig.json         // output to `module` directory
- tsconfig.cjs.json     // output to `cjs` directory
- cjs/
    - package.json      // { "type": "commonjs" }
    - index.js          // Node.js treat it as CommonJS module
- module/
    - package.json      // { "type": "module" }
    - index.js          // Node.js treat it as ESModule
```

For more details, please see [Dual CommonJS/ES module packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages) in Node.js official document.

- Example: [tsconfig-to-dual-package-example](https://github.com/azu/tsconfig-to-dual-package-example)
  - Distribution files: https://www.npmjs.com/package/@azu/tsconfig-to-dual-package-example?activeTab=explore


## Limitation

This tool copy almost fields from `package.json` to generated `{outDir}/package.json`.
However, it does not copy `main`, `module`, `exports`, `types` fields because it points invalid file path.
It defined in [OMIT_FIELDS](https://github.com/search?q=repo%3Aazu%2Ftsconfig-to-dual-package%20OMIT_FIELDS&type=code) constant.

## Used by

- [eventmit](https://github.com/azu/eventmit)
  - Work on CJS: https://github.com/azu/events-to-async/pull/4
  - Work on ESM: https://github.com/azu/eventmit-module-env
  - Work on Deno: https://github.com/azu/eventmit-deno-env
  - Work on Browser: https://codesandbox.io/s/determined-poitras-yll61f?file=/index.html
- [safe-marked](https://github.com/azu/safe-marked)
  - Migraion PR: [feat: Support CJS and ESM as dual package by azu · Pull Request #58 · azu/safe-marked](https://github.com/azu/safe-marked/pull/58)

## Motivation

- TypeScript disallow to change file extension of generated files from `.ts` by Design
  - [Feature Request: allow change file extension of generated files from `.ts` · Issue #49462 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/49462)
  - [allow voluntary .ts suffix for import paths · Issue #37582 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/37582)
  - [bug(esm): TypeScript is not an ECMAScript superset post-ES2015 · Issue #50501 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/50501)
- Node.js require separate `.mjs` and `.cjs` if you need to get dual package in one package

As a result, TypeScript and Node.js ESM support is conflicting.
It is hard that you can support dual package with same `.js` extension.

Of course, you can use [tsc-multi](https://www.npmjs.com/package/tsc-multi) or [Packemon](https://packemon.dev/) to support dual packages.
However, These are build tools. I want to use TypeScript compiler(`tsc`) directly.

`tsconfig-to-dual-package` do not touch TypeScript compiler(`tsc`) process.
It just put `package.json`(`{ "type": "module" }` or `"{ "type": "commonjs" }`) to `outDir` for each tsconfig.json after `tsc` compile source codes.

[@aduh95](https://github.com/aduh95) describe the mechanism in <https://github.com/nodejs/node/issues/34515#issuecomment-664209714>

> For reference, the `library-package/package.json` contains:
>
> ```json
> {
> 	"name": "library-package",
> 	"version": "1.0.0",
> 	"main": "./index-cjs.js",
> 	"exports": {
> 		"import": "./index-esm.js",
> 		"require": "./index-cjs.js"
> 	},
> 	"type": "module"
> }
> ```
>
> Setting `"type": "module"` makes Node.js interpret all `.js` files as ESM, including `index-cjs.js`. When you remove it, all `.js` files will be interpreted as CJS, including `index-esm.js`. If you want to support both with `.js` extension, you should create two subfolders:
>
> ```shell
> $ mkdir ./cjs ./esm
> $ echo '{"type":"commonjs"}' > cjs/package.json
> $ echo '{"type":"module"}' > esm/package.json
> $ git mv index-cjs.js cjs/index.js
> $ git mv index-esm.js esm/index.js
> ```
>
> And then have your package exports point to those subfolders:
>
> ```json
> {
> 	"name": "library-package",
> 	"version": "1.0.0",
> 	"main": "./cjs/index.js",
> 	"exports": {
> 		"import": "./esm/index.js",
> 		"require": "./cjs/index.js"
> 	},
> 	"type": "module"
> }
> ```


Also, Node.js documentation describe this behavior as follows

> The nearest parent package.json is defined as the first package.json found when searching in the current folder, that folder's parent, and so on up until a node_modules folder or the volume root is reached.
> ```json5
> // package.json
> {
>   "type": "module"
> }
> ```
> ```bash
> # In same folder as preceding package.json
> node my-app.js # Runs as ES module
> ```
> If the nearest parent package.json lacks a "type" field, or contains "type": "commonjs", .js files are treated as [CommonJS](https://nodejs.org/api/modules.html). If the volume root is reached and no package.json is found, .js files are treated as [CommonJS](https://nodejs.org/api/modules.html).  
> 
> -- https://nodejs.org/api/packages.html#type

## Pros and Cons

**Pros**

- You can use TypeScript compiler(`tsc`) directly
  - No additional bundler, transpiler, build tool

**Cons**

- You need to run `tsconfig-to-dual-package` after `tsc` compile
- This tool copy `package.json` to `outDir`. This approach may affect path finding for `package.json` like [read-pkg-up](https://github.com/sindresorhus/read-pkg-up)
- [Dual package hazard](https://nodejs.org/api/packages.html#dual-package-hazard) - I recommend that you should not use this approach for stateful package.
  - For example, a singleton and `instanceof` check for user-input may cause unexpected behavior.
  - This Dual package has a risk of loading double(`require` and `import` load separate resources).
  - Very large package may want to prevent loading double package. For example, a large dictionary included package.
- Dual package is hard to use some API like `__diranme`, `__filename` without transpiler
  - Normally, you can use [`import.meta.url` and `new URL(..., import.meta.url)`](https://stackoverflow.com/questions/46745014/alternative-for-dirname-in-node-js-when-using-es6-modules) to get `__dirname` and `__filename` in ESM.
  - On the other hands, `import.meta.url` is disallowed syntax in CJS
  - `import.meta` is not defined in CJS
  - `__diraname` is not defined in ESM
  - As a result, it is hard to use `__dirname` and `__filename` in dual package.
  - Some package get these via Error stack trace
    - [bevry/filedirname: Fetch the current file and directory path, no matter your environment (Deno, Node.js, Web Browsers, ESM, CJS)](https://github.com/bevry/filedirname)
    - [fwh1990/this-file: Create dynamic __dirname, __filename and require method for both ESM and CJS](https://github.com/fwh1990/this-file)
    - [JumpLink/cross-dirname: Node.js + Gjs + Deno module that returns the current script dirname. Similar to __dirname but also works in CommonJs and ES modules.](https://github.com/JumpLink/cross-dirname)
  - 🆘 If you know a solution about this problem, please send pull request!

## FAQ

### What should I do support dual package?

- Example repository: [tsconfig-to-dual-package-example](https://github.com/azu/tsconfig-to-dual-package-example)
- Pull Request: [feat: support dual package by azu · Pull Request #2 · azu/tsconfig-to-dual-package-example](https://github.com/azu/tsconfig-to-dual-package-example/pull/2)
- Steps:
  - Install `tsconfig-to-dual-package`: `npm install --save-dev tsconfig-to-dual-package`
  - Add `"type": "module"` to package.json via `npm pkg set type=module`
  - Add `tsconfig.json` and `tsconfig.cjs.json`
  - Create `tsconfig.json` and set it to use `module: "esnext"`
  - Create `tsconfig.cjs.json` and set it to use `module: "commonjs"`
  - Add `tsconfig-to-dual-package` to build script
    - `"build": "tsc -p ./tsconfig.json && tsc -p ./tsconfig.cjs.json && tsconfig-to-dual-package"`
  - Add `"main"`/`"types"`(for backward compatibility)/`"files"`/`"exports"` fields to `package.json`
    - `"files": ["lib/", "module/"]` (lib/ = cjs, module/ = esm)
    - `"main"`/`"types"`/`"exports"`
    ```json
    {
      "main": "./lib/index.js",
      "types": "./lib/index.d.ts",
      "exports": {
        ".": {
          "import": {
            "types": "./module/index.d.ts",
            "default": "./module/index.js"
          },
          "require": {
            "types": "./lib/index.d.ts",
            "default": "./lib/index.js"
          },
          "default": "./module/index.js"
        },
        "./package.json": "./package.json"
      }
    }
    ```
  - Check Check Check
    - Lint
      - [`npx publint`](https://github.com/bluwy/publint) is helpful
      - [dependency-check@5](https://github.com/dependency-check-team/dependency-check/releases) is useful
    - Test
      - use `ts-node/esm` instead of `ts-node` for testing
      - https://github.com/TypeStrong/ts-node#node-flags-and-other-tools
  - Publish!
    - `npm publish`
  - After Check!
    - [publint](https://publint.dev/)
    - Load test via require/import 

### Is there a migration script?

It is not for everyone, but I wrote a migration script for TypeScript project.

- [Migration Script: Convert TypeScript project to Node.js dual package](https://gist.github.com/azu/f383ba74c80d17806badd49745ce2129)
  - This script make almost migration automatic
  - Use [`npm pkg`](https://docs.npmjs.com/cli/v8/commands/npm-pkg?v=true) command for change `package.json`
  - Use [tsconfig-to-dual-package](https://github.com/azu/tsconfig-to-dual-package) to build dual package
  - Use [eslint-cjs-to-esm](https://github.com/azu/eslint-cjs-to-esm) to migrate source code to ESM from CJS
  - Use [publint](https://publint.dev/) to check `package.json`

Example Result:

- [refactor: migrate to dual package by azu · Pull Request #4 · azu/markdown-function](https://github.com/azu/markdown-function/pull/4)

### Should I migrate to dual package?

- If your package is a library, you should migrate to dual package if possible
  - Because dual package reduce interop issues between CJS and ESM
  - If your package is just logics, you can move to dual package
- If your package is a Command Line Tool(CLI), you not need to migrate to dual package
  - Because CLI is not loaded from `require` function
  - You can move to [Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

## References

- [Dual CommonJS/ES module packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)
- [Improve documentation on Dual Module Packages · Issue #34515 · nodejs/node](https://github.com/nodejs/node/issues/34515#issuecomment-664209714)
- [TypeScript: Documentation - ECMAScript Modules in Node.js](https://www.typescriptlang.org/docs/handbook/esm-node.html)
  - Why `types` fields at first
  - Issue: [package.json `exports` resolution uses fallback conditions, unlike Node · Issue #50762 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/50762)
- [why is there a package.json export for `package.json`? · Issue #1 · tsmodule/tsmodule](https://github.com/tsmodule/tsmodule/issues/1#issuecomment-1065500448)
  - Why add `"./package.json": "./package.json"` 
  - [Special treatment for package.json resolution and exports? · Issue #33460 · nodejs/node](https://github.com/nodejs/node/issues/33460)
- [frehner/modern-guide-to-packaging-js-library: A guide to help ensure your JavaScript library is the most compatible, fast, and efficient library you can make.](https://github.com/frehner/modern-guide-to-packaging-js-library)

## Related

- [publint](https://publint.dev/): Lint your `exports` field in `package.json`
- [eslint-cjs-to-esm](https://github.com/azu/eslint-cjs-to-esm): help you to migrate CJS to ESM
- [isaacs/rimraf: A `rm -rf` util for nodejs](https://github.com/isaacs/rimraf): use same approach

## Changelog

See [Releases page](https://github.com/azu/tsconfig-to-dual-package/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/tsconfig-to-dual-package/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- azu: [GitHub](https://github.com/azu), [Twitter](https://twitter.com/azu_re)

## License

MIT © azu

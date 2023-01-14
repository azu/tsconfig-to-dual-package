# tsconfig-to-dual-package

A simple tool that add package.json({&#34;type&#34;:&#34;commonjs&#34; or &#34;module&#34;}) to TypeScript outDir for dual package.

## Install

Install with [npm](https://www.npmjs.com/):

    npm install tsconfig-to-dual-package --save-dev

Requirements: This tool depended on `typescript` package for parsing `tsconfig.json` file.
It means that You need to install `typescript` as dependency in your project.

- PeerDependency:
  - `typescript`: `*` (any version)

## Usage

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

## How it works

This tool adds `package.json` to tsconfig.json `outDir` for dual package.
Each generated `package.json` has `type` field that is `commonjs` or `module`.

Example: Your project `package.json` is following:

```json
{
  "name": "my-package",
  "version": "1.0.0",
  "type": "module",
  "main": "lib/index.js",
  "module": "module/index.mjs",
  "exports": {
    ".": {
      "import": "./module/index.mjs",
      "require": "./lib/index.js"
    }
  }
}
```

and This project has `tsconfig.json` and `tsconfig.cjs.json`:

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

```json6
  "scripts": {
    "build": "tsc -p . && tsc -p ./tsconfig.cjs.json && tsconfig-to-dual-package",
  }
```

`tsconfig-to-dual-package` command adds `package.json` to `module` and `cjs` directory.

As a result, you can publish both CommonJS and ES Module packages.

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


## Limitation

This tool copy almost fields from `package.json` to generated `{outDir}/package.json`.
However, it does not copy `main`, `module`, `exports`, `types` fields because it points invalid file path.
It defined in [OMIT_FIELDS](OMIT_FIELDS) constant.

## References

- [Dual CommonJS/ES module packages](https://nodejs.org/api/packages.html#dual-commonjses-module-packages)
- [Improve documentation on Dual Module Packages · Issue #34515 · nodejs/node](https://github.com/nodejs/node/issues/34515#issuecomment-664209714)
- [rimraf/fixup.sh at v4 · isaacs/rimraf](https://github.com/isaacs/rimraf/blob/08bbb06a8077366dfcfccb4e6b77d654ddc0891f/fixup.sh)

## Used by

- [eventmit](https://github.com/azu/eventmit)
  - Work on CJS: https://github.com/azu/events-to-async/pull/4
  - Work on ESM: https://github.com/azu/eventmit-module-env
  - Work on Deno: https://github.com/azu/eventmit-deno-env
  - Work on Browser: https://codesandbox.io/s/determined-poitras-yll61f?file=/index.html

## Motivation

- TypeScript disallow change file extension of generated files from `.ts` by Design
  - [Feature Request: allow change file extension of generated files from `.ts` · Issue #49462 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/49462)
  - [allow voluntary .ts suffix for import paths · Issue #37582 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/37582)
  - [bug(esm): TypeScript is not an ECMAScript superset post-ES2015 · Issue #50501 · microsoft/TypeScript](https://github.com/microsoft/TypeScript/issues/50501)
- If you want to support Node.js dual packages in one package.json, you need to separate `.mjs` and `.cjs`.

As a result, TypeScript and Node.js ESM support is conflicting.
It is hard that you can support dual pakcage with same `.js` extension.

Off curse, you can use [tsc-multi](https://www.npmjs.com/package/tsc-multi) or [Packemon](https://packemon.dev/) to support dual packages.
However, These are build tools and I want to use TypeScript compiler(`tsc`) directly.

`tsconfig-to-dual-package` do not touch TypeScript compiler(`tsc`) process.
It just put `package.json`(`{ "type": "module" }` or `"{ "type": "commonjs" }) to `outDir` for each tsconfig.json after `tsc` compile source codes.

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


- [ ] Need to get Node.js Official document about this mechanism

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

# GoFSH (WORK IN PROGRESS)

GoFSH is a FHIR Shorthand (FSH) decompiler, able to convert formal FHIR definitions from JSON to FSH. _GoFSH is in the early stages of development. See the LIMITATIONS section for details._

FHIR Shorthand (FSH) is a specially-designed language for defining the content of FHIR Implementation Guides (IG). It is simple and compact, with tools to produce Fast Healthcare Interoperability Resources (FHIR) profiles, extensions and implementation guides (IG). Because it is a language, written in text statements, FHIR Shorthand encourages distributed, team-based development using conventional source code control tools such as Github.

For more information about the evolving FSH syntax see the [FHIR Shorthand Reference Manual](https://build.fhir.org/ig/HL7/fhir-shorthand/).

# LIMITATIONS

GoFSH is in the early stages of development; it is neither functionally complete nor bug-free. GoFSH users should use GoFSH with caution, reviewing all outputs before integrating them into FSH projects.

As of the 0.1.0 release (early September 2020):
* GoFSH outputs valid FSH for most profiles and extensions.
  * Generated profile and extension definitions should be _technically_ correct, but may not use the most efficient FSH representation or follow FSH authoring best practices.
  * Generated profile and extension definitions do not use the Mapping or Invariant features of FSH; "caret" rules are used instead. Future versions of GoFSH will address this.
* GoFSH does not output the content of Code System definitions; it declares them using keywords, but does not generate any of their rules.
* GoFSH does not output ValueSet definitions.
* GoFSH does not output Instance definitions (this includes examples, as well as any definitions that must be created in FSH using the _Instance_ keyword).
* GoFSH does not process or consider the ImplementationGuide JSON when generating FSH.
* GoFSH does not support generating FSH from FHIR XML definitions.

# Installation for GoFSH Users

GoFSH requires [Node.js](https://nodejs.org/) to be installed on the user's system.  Users should install Node.js 12 (LTS), although the previous LTS version (Node.js 10) is also expected to work.

Once Node.js is installed, run the following command to install or update GoFSH:

```sh
$ npm install -g gofsh
```

After installation, the `gofsh` commandline will be available on your path:

```sh
$ gofsh --help

Usage: goFSH [path-to-fhir-resources] [options]

Options:
  -o, --out <out>                     the path to the output folder
  -l, --log-level <level>             specify the level of log messages: error, warn, info (default), debug
  -d, --dependency <dependency...>    specify dependencies to be loaded using format dependencyId@version (FHIR R4 included by default)
  -v, --version                       print goFSH version
  -h, --help                          display help for command
  -s, --style                         specify how the output is organized into files: group-by-fsh-type (default), group-by-profile, single-file, file-per-definition
  -f, --fshing-trip [use-local-sushi] run SUSHI on the output of GoFSH and generate a comparison of the round trip results, add "use-local-sushi" after flag to use your locally installed version of SUSHI
```

# Installation for Developers

GoFSH is a [TypeScript](https://www.typescriptlang.org/) project.  At a minimum, GoFSH requires [Node.js](https://nodejs.org/) to build, test, and run the CLI.  Developers should install Node.js 12 (LTS), although the previous LTS version (Node.js 10) is also expected to work.

Once Node.js is installed, run the following command from this project's root folder:

```sh
$ npm install
```

# NPM tasks

The following NPM tasks are useful in development:

| Task | Description |
| ---- | ----------- |
| **build** | compiles `src/**/*.ts` files to `dist/**/*.js` files using the TypeScript compiler (tsc) |
| **test** | runs all unit tests using Jest |
| **test:watch** | similar to _test_, but automatically runs affected tests when changes are detected in src files |
| **coverage** | launches your browser to display the test coverage report |
| **lint** | checks all src files to ensure they follow project code styles and rules |
| **lint:fix** | fixes lint errors when automatic fixes are available for them |
| **prettier** | checks all src files to ensure they follow project formatting conventions |
| **prettier:fix** | fixes prettier errors by rewriting files using project formatting conventions |
| **check** | runs all the checks performed as part of ci (test, lint, prettier) |
| **prepare** | runs the build task before this project is packed or published |
| **prepublishOnly** | runs the check task before this project is published |

To run any of these tasks, use `npm run`.  For example:

```sh
$ npm run check
```

# Recommended Development Environment

For the best experience, developers should use [Visual Studio Code](https://code.visualstudio.com/) with the following plugins:

* [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
* [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  * Consider configuring the formatOnSave feature in VS Code settings:
    ```json
    "[typescript]": {
        "editor.formatOnSave": true
    }
    ```
* [vscode-language-fsh](https://marketplace.visualstudio.com/items?itemName=kmahalingam.vscode-language-fsh)

# License

Copyright 2020 Health Level Seven International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

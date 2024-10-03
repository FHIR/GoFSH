# GoFSH

GoFSH is a FHIR Shorthand (FSH) decompiler, able to convert formal FHIR definitions from JSON to FSH.

FHIR Shorthand (FSH) is a specially-designed language for defining the content of FHIR Implementation Guides (IG). It is simple and compact, with tools to produce Fast Healthcare Interoperability Resources (FHIR) profiles, extensions and implementation guides (IG). Because it is a language, written in text statements, FHIR Shorthand encourages distributed, team-based development using conventional source code control tools such as Github.

For more information about the evolving FSH syntax see the [FHIR Shorthand Reference Manual](https://build.fhir.org/ig/HL7/fhir-shorthand/).

## FHIR Foundation Project Statement

* Maintainers: This project is maintained by the HL7 community.
* Issues / Discussion: For GoFSH issues, such as bug reports, comments, suggestions, questions, and feature requests, visit [GoFSH Github Issues](https://github.com/FHIR/GoFSH/issues). For discussion of FHIR Shorthand and its associated projects, visit the FHIR Community Chat @ https://chat.fhir.org. The [#shorthand stream](https://chat.fhir.org/#narrow/stream/215610-shorthand) is used for all FHIR Shorthand questions and discussion.
* License: All contributions to this project will be released under the Apache 2.0 License, and a copy of this license can be found in [LICENSE](LICENSE).
* Contribution Policy: The GoFSH Contribution Policy can be found in [CONTRIBUTING.md](CONTRIBUTING.md).
* Security Information: The GoFSH Security Information can be found in [SECURITY.md](SECURITY.md).
* Compliance Information: GoFSH supports importing FHIR R4, FHIR R4B, and FHIR R5 artifacts. GoFSH assumes valid FHIR inputs. If invalid FHIR artifacts are provided as input, GoFSH may report errors and/or create invalid FSH. The GoFSH source code includes a comprehensive suite of unit tests to test GoFSH's own behavior and compliance with FHIR, which can be found in the [test](test) directory.

# GoFSH User Instructions

## Installation for GoFSH Users

GoFSH requires [Node.js](https://nodejs.org/) to be installed on the user's system. Users should install Node.js 18. Although previous versions of Node.js may work, they are not officially supported.

Once Node.js is installed, run the following command to install or update GoFSH:

```sh
$ npm install -g gofsh
```

After installation, the `gofsh` commandline will be available on your path:

```sh
$ gofsh --help

Usage: goFSH [path-to-fhir-resources] [options]

Options:
  -o, --out <out>                    the path to the output folder
  -l, --log-level <level>            specify the level of log messages: error, warn, info (default), debug
  -d, --dependency <dependency...>   specify dependencies to be loaded using format dependencyId@version (FHIR R4 included by default)
  -s, --style <style>                specify how the output is organized into files: file-per-definition (default), group-by-fsh-type, group-by-profile, single-file
  -f, --fshing-trip                  run SUSHI on the output of GoFSH and generate a comparison of the round trip results
  -i, --installed-sushi              use the locally installed version of SUSHI when generating comparisons with the "-f" option
  -t, --file-type <type>             specify which file types GoFSH should accept as input: json-only (default), xml-only, json-and-xml
  --indent                           output FSH with indented rules using context paths
  --meta-profile <mode>              specify how meta.profile on Instances should be applied to the InstanceOf keyword: only-one (default), first, none
  -a, --alias-file <alias-filePath>  specify an existing FSH file containing aliases to be loaded.
  --no-alias                         output FSH without generating Aliases
  -u, --useFHIRVersion <fhirVersion> specify which FHIR version to use when it cannot be inferred
  -v, --version                      print goFSH version
  -h, --help                         display help for command
```

# GoFSH Developer Instructions

## Intro to GoFSH Development

To learn more about GoFSH, watch the Knowledge Sharing Sessions for [Developing FSH Tools](https://vimeo.com/990594228/056b5c075f) (view the slides [here](https://confluence.hl7.org/display/FHIR/FSH+Knowledge+Sharing+Sessions?preview=/256509612/256514908/KSS%203%20-%20Developing%20FSH%20Tools.pdf)) and [Developing GoFSH](https://vimeo.com/1001309480/f2b262aee7) (view the slides [here](https://confluence.hl7.org/display/FHIR/FSH+Knowledge+Sharing+Sessions?preview=/256509612/265487253/KSS%205%20-%20Developing%20GoFSH.pdf)).
These sessions provide a technical overview of the codebase and summarize key concepts for developers.

## Installation for Developers

GoFSH is a [TypeScript](https://www.typescriptlang.org/) project. At a minimum, GoFSH requires [Node.js](https://nodejs.org/) to build, test, and run the CLI. Developers should install Node.js 18. Although previous versions of Node.js may work, they are not officially supported.

Once Node.js is installed, run the following command from this project's root folder:

```sh
$ npm install
```

## NPM tasks

The following NPM tasks are useful in development:

| Task               | Description                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| **build**          | compiles `src/**/*.ts` files to `dist/**/*.js` files using the TypeScript compiler (tsc)        |
| **test**           | runs all unit tests using Jest                                                                  |
| **test:watch**     | similar to _test_, but automatically runs affected tests when changes are detected in src files |
| **coverage**       | launches your browser to display the test coverage report                                       |
| **lint**           | checks all src files to ensure they follow project code styles and rules                        |
| **lint:fix**       | fixes lint errors when automatic fixes are available for them                                   |
| **prettier**       | checks all src files to ensure they follow project formatting conventions                       |
| **prettier:fix**   | fixes prettier errors by rewriting files using project formatting conventions                   |
| **check**          | runs all the checks performed as part of ci (test, lint, prettier)                              |
| **prepare**        | runs the build task before this project is packed or published                                  |
| **prepublishOnly** | runs the check task before this project is published                                            |

To run any of these tasks, use `npm run`. For example:

```sh
$ npm run check
```

## Recommended Development Environment

For the best experience, developers should use [Visual Studio Code](https://code.visualstudio.com/) with the following plugins:

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - Consider configuring the formatOnSave feature in VS Code settings:
    ```json
    "[typescript]": {
        "editor.formatOnSave": true
    }
    ```
- [vscode-language-fsh](https://marketplace.visualstudio.com/items?itemName=kmahalingam.vscode-language-fsh)

# License

Copyright 2020-2024 Health Level Seven International

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

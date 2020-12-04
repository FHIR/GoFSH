import { EOL } from 'os';
import { Package } from '../processor';
import { logger } from '../utils';

export class FSHExporter {
  constructor(public readonly fshPackage: Package) {}

  export(style: string): Map<string, string> {
    let exports: Map<string, string>;
    switch (style) {
      case 'single-file':
        exports = this.groupAsSingleFile();
        break;
      case 'by-category':
        exports = this.groupByCategory();
        break;
      default:
        if (style != null) {
          logger.warn(`Unrecognized output style "${style}". Defaulting to "single-file" style.`);
        }
        exports = this.groupAsSingleFile();
    }

    logger.info(
      `Exported ${this.fshPackage.profiles.length} Profile${
        this.fshPackage.profiles.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.extensions.length} Extension${
        this.fshPackage.extensions.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.codeSystems.length} CodeSystem${
        this.fshPackage.codeSystems.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.valueSets.length} ValueSet${
        this.fshPackage.valueSets.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.instances.length} Instance${
        this.fshPackage.instances.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.invariants.length} Invariant${
        this.fshPackage.invariants.length == 1 ? '' : 's'
      }.`
    );
    logger.info(
      `Exported ${this.fshPackage.mappings.length} Mapping${
        this.fshPackage.mappings.length == 1 ? '' : 's'
      }.`
    );

    return exports;
  }

  private groupAsSingleFile(): Map<string, string> {
    const results: string[] = [];
    if (this.fshPackage.aliases.length > 0) {
      results.push(this.fshPackage.aliases.map(a => a.toFSH()).join(EOL));
    }
    for (const profile of this.fshPackage.profiles) {
      results.push(profile.toFSH());
    }
    for (const extension of this.fshPackage.extensions) {
      results.push(extension.toFSH());
    }
    for (const codeSystem of this.fshPackage.codeSystems) {
      results.push(codeSystem.toFSH());
    }
    for (const valueSet of this.fshPackage.valueSets) {
      results.push(valueSet.toFSH());
    }
    for (const instance of this.fshPackage.instances) {
      results.push(instance.toFSH());
    }
    for (const invariant of this.fshPackage.invariants) {
      results.push(invariant.toFSH());
    }
    for (const mapping of this.fshPackage.mappings) {
      results.push(mapping.toFSH());
    }
    return new Map().set('resources.fsh', results.join(`${EOL}${EOL}`));
  }

  private groupByCategory(): Map<string, string> {
    const exports: Map<string, string> = new Map();
    exports.set(
      'profiles.fsh',
      this.fshPackage.profiles.map(profile => profile.toFSH()).join(`${EOL}${EOL}`)
    );
    exports.set(
      'extensions.fsh',
      this.fshPackage.extensions.map(extension => extension.toFSH()).join(`${EOL}${EOL}`)
    );
    exports.set(
      'terminology.fsh',
      [
        ...this.fshPackage.valueSets.map(valueSet => valueSet.toFSH()),
        ...this.fshPackage.codeSystems.map(codeSystem => codeSystem.toFSH())
      ].join(`${EOL}${EOL}`)
    );
    exports.set(
      'instances.fsh',
      this.fshPackage.instances.map(instance => instance.toFSH()).join(`${EOL}${EOL}`)
    );
    exports.set(
      'invariants.fsh',
      this.fshPackage.invariants.map(invariant => invariant.toFSH()).join(`${EOL}${EOL}`)
    );
    exports.set(
      'mappings.fsh',
      this.fshPackage.mappings.map(mapping => mapping.toFSH()).join(`${EOL}${EOL}`)
    );
    return exports;
  }
}

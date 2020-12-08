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
      case 'by-type':
        exports = this.groupByType();
        break;
      case 'file-per-definition':
        exports = this.groupAsFilePerDefinition();
        break;
      default:
        if (style != null) {
          logger.warn(`Unrecognized output style "${style}". Defaulting to "by-category" style.`);
        }
        exports = this.groupByCategory();
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

    // Remove any empty files
    const keys = exports.keys();
    Array.from(keys).forEach(key => {
      if (/^\s*$/.test(exports.get(key))) {
        exports.delete(key);
      }
    });

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

  private groupAsFilePerDefinition(): Map<string, string> {
    const exports: Map<string, string> = new Map();
    // Aliases, Invariants, and Mappings still get grouped into one file
    exports.set('aliases.fsh', this.fshPackage.aliases.map(a => a.toFSH()).join(EOL));
    exports.set(
      'invariants.fsh',
      this.fshPackage.invariants.map(invariant => invariant.toFSH()).join(`${EOL}${EOL}`)
    );
    exports.set(
      'mappings.fsh',
      this.fshPackage.mappings.map(mapping => mapping.toFSH()).join(`${EOL}${EOL}`)
    );
    // Other definitions are each placed in an individual file
    for (const profile of this.fshPackage.profiles) {
      exports.set(`${profile.name}-Profile.fsh`, profile.toFSH());
    }
    for (const extension of this.fshPackage.extensions) {
      exports.set(`${extension.name}-Extension.fsh`, extension.toFSH());
    }
    for (const codeSystem of this.fshPackage.codeSystems) {
      exports.set(`${codeSystem.name}-CodeSystem.fsh`, codeSystem.toFSH());
    }
    for (const valueSet of this.fshPackage.valueSets) {
      exports.set(`${valueSet.name}-ValueSet.fsh`, valueSet.toFSH());
    }
    for (const instance of this.fshPackage.instances) {
      exports.set(`${instance.name}-Instance.fsh`, instance.toFSH());
    }
    for (const instance of this.fshPackage.instances) {
      exports.set(`${instance.name}-Instance.fsh`, instance.toFSH());
    }

    return exports;
  }

  private groupByCategory(): Map<string, string> {
    const exports: Map<string, string> = new Map();
    exports.set('aliases.fsh', this.fshPackage.aliases.map(a => a.toFSH()).join(EOL));
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

  private groupByType(): Map<string, string> {
    const files: Map<string, string[]> = new Map();

    // Group profiles and examples of those profiles into individual files
    this.fshPackage.profiles.forEach(profile => {
      files.set(`${profile.name}.fsh`, [profile.toFSH()]);
    });
    this.fshPackage.instances.forEach(instance => {
      if (instance.usage === 'Example' && files.has(`${instance.instanceOf}.fsh`)) {
        files.get(`${instance.instanceOf}.fsh`).push(instance.toFSH());
      } else if (files.has('instances.fsh')) {
        files.get('instances.fsh').push(instance.toFSH());
      } else {
        files.set('instances.fsh', [instance.toFSH()]);
      }
    });

    // All other artifacts are grouped by category
    files.set('aliases.fsh', [this.fshPackage.aliases.map(a => a.toFSH()).join(EOL)]);
    files.set(
      'extensions.fsh',
      this.fshPackage.extensions.map(extension => extension.toFSH())
    );
    files.set('terminology.fsh', [
      ...this.fshPackage.valueSets.map(valueSet => valueSet.toFSH()),
      ...this.fshPackage.codeSystems.map(codeSystem => codeSystem.toFSH())
    ]);

    files.set(
      'invariants.fsh',
      this.fshPackage.invariants.map(invariant => invariant.toFSH())
    );
    files.set(
      'mappings.fsh',
      this.fshPackage.mappings.map(mapping => mapping.toFSH())
    );

    const exports: Map<string, string> = new Map();
    files.forEach((content, fileName) => exports.set(fileName, content.join(`${EOL}${EOL}`)));
    return exports;
  }
}

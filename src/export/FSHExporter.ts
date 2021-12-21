import table from 'text-table';
import { partition } from 'lodash';
import { EOL } from 'os';
import path from 'path';
import {
  Exportable,
  ExportableAlias,
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableExtension,
  ExportableInstance,
  ExportableInvariant,
  ExportableObeysRule,
  ExportableProfile,
  NamedExportable,
  ExportableLogical,
  ExportableResource
} from '../exportable';
import { Package } from '../processor';
import { logger } from '../utils';
import { fshMap, exportStyle, ResourceMap } from '../api';
import sanitize from 'sanitize-filename';

export class FSHExporter {
  constructor(public readonly fshPackage: Package) {}

  export(style: string): Map<string, string> {
    let files: Map<string, Exportable[]>;
    switch (style) {
      case 'single-file':
        files = this.groupAsSingleFile();
        break;
      case 'group-by-fsh-type':
        files = this.groupByFSHType();
        break;
      case 'group-by-profile':
        files = this.groupByProfile();
        break;
      case 'file-per-definition':
        files = this.groupAsFilePerDefinition();
        break;
      default:
        if (style != null) {
          logger.warn(`Unrecognized output style "${style}". Defaulting to "by-category" style.`);
        }
        files = this.groupAsFilePerDefinition();
    }

    const writtenFiles: Map<string, string> = new Map();

    const index: string[][] = [];
    files.forEach((exportables, file) => {
      const fileContent = this.writeExportableGroup(exportables);
      // Ignore empty files, and don't write them to index.txt
      if (!fileContent) {
        return;
      }
      writtenFiles.set(file, fileContent);
      exportables
        .filter(e => !(e instanceof ExportableAlias))
        .forEach((exportable: NamedExportable) => {
          // The index will have the name, FSH type, and file of the entity
          index.push([
            exportable.name,
            exportable.constructor.name.replace('Exportable', ''),
            file
          ]);
        });
    });

    // Alphabetically sort the index by the name of the entity
    index.sort((line1, line2) => (line1[0] > line2[0] ? 1 : -1));
    index.unshift(['Name', 'Type', 'File']);
    writtenFiles.set('index.txt', table(index));

    return writtenFiles;
  }

  apiExport(exportType: exportStyle): string | fshMap {
    if (exportType === 'string') {
      return this.writeExportableGroup([
        ...this.fshPackage.aliases,
        ...this.fshPackage.profiles,
        ...this.fshPackage.extensions,
        ...this.fshPackage.logicals,
        ...this.fshPackage.resources,
        ...this.fshPackage.codeSystems,
        ...this.fshPackage.valueSets,
        ...this.fshPackage.instances,
        ...this.fshPackage.invariants,
        ...this.fshPackage.mappings
      ]);
    } else if (exportType === 'map') {
      const fshMap = {
        aliases: '',
        invariants: new ResourceMap(),
        mappings: new ResourceMap(),
        profiles: new ResourceMap(),
        extensions: new ResourceMap(),
        logicals: new ResourceMap(),
        resources: new ResourceMap(),
        codeSystems: new ResourceMap(),
        valueSets: new ResourceMap(),
        instances: new ResourceMap()
      };
      fshMap.aliases = this.writeExportableGroup(this.fshPackage.aliases);
      for (const invariant of this.fshPackage.invariants) {
        fshMap.invariants.set(invariant.name, invariant.toFSH());
      }
      for (const mapping of this.fshPackage.mappings) {
        fshMap.mappings.set(mapping.name, mapping.toFSH());
      }
      for (const profile of this.fshPackage.profiles) {
        fshMap.profiles.set(profile.name, profile.toFSH());
      }
      for (const extension of this.fshPackage.extensions) {
        fshMap.extensions.set(extension.name, extension.toFSH());
      }
      for (const logical of this.fshPackage.logicals) {
        fshMap.logicals.set(logical.name, logical.toFSH());
      }
      for (const resource of this.fshPackage.resources) {
        fshMap.resources.set(resource.name, resource.toFSH());
      }
      for (const codeSystem of this.fshPackage.codeSystems) {
        fshMap.codeSystems.set(codeSystem.name, codeSystem.toFSH());
      }
      for (const valueSet of this.fshPackage.valueSets) {
        fshMap.valueSets.set(valueSet.name, valueSet.toFSH());
      }
      for (const instance of this.fshPackage.instances) {
        fshMap.instances.set(instance.name, instance.toFSH());
      }
      return fshMap;
    }
  }

  private writeExportableGroup(exportables: Exportable[]): string {
    // Aliases are each their own "exportable", but should be joined together
    // by a single EOL, not double EOLs, and they should not be written in index.txt
    // so they are handled separately
    const [aliases, namedExportables] = partition(
      exportables,
      exportable => exportable instanceof ExportableAlias
    );
    return [
      aliases.map(a => a.toFSH()).join(EOL),
      namedExportables.map(e => e.toFSH()).join(`${EOL}${EOL}`)
    ]
      .join(`${EOL}${EOL}`)
      .trim();
  }

  private groupAsSingleFile(): Map<string, Exportable[]> {
    const results: Exportable[] = [];
    results.push(...this.fshPackage.aliases);
    results.push(...this.fshPackage.profiles);
    results.push(...this.fshPackage.extensions);
    results.push(...this.fshPackage.logicals);
    results.push(...this.fshPackage.resources);
    results.push(...this.fshPackage.codeSystems);
    results.push(...this.fshPackage.valueSets);
    results.push(...this.fshPackage.instances);
    results.push(...this.fshPackage.invariants);
    results.push(...this.fshPackage.mappings);
    return new Map().set('resources.fsh', results);
  }

  private groupAsFilePerDefinition(): Map<string, Exportable[]> {
    const files: Map<string, Exportable[]> = new Map();
    // Aliases, still get grouped into one file
    files.set('aliases.fsh', this.fshPackage.aliases);

    // Other definitions are each placed in an individual file
    for (const invariant of this.fshPackage.invariants) {
      const filename = path.join('invariants', `${this.cleanFileName(invariant.name)}.fsh`);
      files.set(filename, [invariant]);
    }
    for (const mapping of this.fshPackage.mappings) {
      const filename = path.join('mappings', `${this.cleanFileName(mapping.name)}.fsh`);
      files.set(filename, [mapping]);
    }
    for (const profile of this.fshPackage.profiles) {
      const filename = path.join('profiles', `${this.cleanFileName(profile.name)}.fsh`);
      files.set(filename, [profile]);
    }
    for (const extension of this.fshPackage.extensions) {
      const filename = path.join('extensions', `${this.cleanFileName(extension.name)}.fsh`);
      files.set(filename, [extension]);
    }
    for (const logical of this.fshPackage.logicals) {
      const filename = path.join('logicals', `${this.cleanFileName(logical.name)}.fsh`);
      files.set(filename, [logical]);
    }
    for (const resource of this.fshPackage.resources) {
      const filename = path.join('resources', `${this.cleanFileName(resource.name)}.fsh`);
      files.set(filename, [resource]);
    }
    for (const codeSystem of this.fshPackage.codeSystems) {
      const filename = path.join('codesystems', `${this.cleanFileName(codeSystem.name)}.fsh`);
      files.set(filename, [codeSystem]);
    }
    for (const valueSet of this.fshPackage.valueSets) {
      const filename = path.join('valuesets', `${this.cleanFileName(valueSet.name)}.fsh`);
      files.set(filename, [valueSet]);
    }
    for (const instance of this.fshPackage.instances) {
      const filename = path.join('instances', `${this.cleanFileName(instance.name)}.fsh`);
      files.set(filename, [instance]);
    }

    return files;
  }

  private groupByFSHType(): Map<string, Exportable[]> {
    const files: Map<string, Exportable[]> = new Map();
    files.set('aliases.fsh', this.fshPackage.aliases);
    files.set('profiles.fsh', this.fshPackage.profiles);
    files.set('extensions.fsh', this.fshPackage.extensions);
    files.set('logicals.fsh', this.fshPackage.logicals);
    files.set('resources.fsh', this.fshPackage.resources);
    files.set('valueSets.fsh', this.fshPackage.valueSets);
    files.set('codeSystems.fsh', this.fshPackage.codeSystems);
    files.set('instances.fsh', this.fshPackage.instances);
    files.set('invariants.fsh', this.fshPackage.invariants);
    files.set('mappings.fsh', this.fshPackage.mappings);
    return files;
  }

  private groupByProfile(): Map<string, Exportable[]> {
    const files: Map<string, Exportable[]> = new Map();

    // Group profiles, logicals, and resources with their related instances and invariants.
    [
      ...this.fshPackage.profiles,
      ...this.fshPackage.logicals,
      ...this.fshPackage.resources
    ].forEach(fshEntity => {
      files.set(`${this.cleanFileName(fshEntity.name)}.fsh`, [fshEntity]);
    });

    files.set('instances.fsh', []);

    const [inlineInstances, nonInlineInstances] = partition(
      this.fshPackage.instances,
      i => i.usage === 'Inline'
    );
    // If a non-inline instance is an example of a profile or resource, it is written to the file
    // for that entity. Otherwise it is written to instances.fsh
    nonInlineInstances.forEach(instance => {
      if (
        instance.usage === 'Example' &&
        files.has(`${this.cleanFileName(instance.instanceOf)}.fsh`)
      ) {
        files.get(`${this.cleanFileName(instance.instanceOf)}.fsh`).push(instance);
      } else {
        files.get('instances.fsh').push(instance);
      }
    });
    // Inline instances are written to the file they are used in, if they are only used
    // in one spot. Otherwise they go to instances.fsh
    inlineInstances.forEach(instance => {
      const usedIn = this.inlineInstanceUsedIn(instance, files);
      usedIn.length === 1
        ? files.get(usedIn[0]).push(instance)
        : files.get('instances.fsh').push(instance);
    });

    // Invariants are written to the same file as the file they are used in, if they
    // are written in one spot. Otherwise they go to invariants.fsh.
    files.set('invariants.fsh', []);
    this.fshPackage.invariants.forEach(invariant => {
      const usedIn = this.invariantUsedIn(invariant, files);
      usedIn.length === 1
        ? files.get(usedIn[0]).push(invariant)
        : files.get('invariants.fsh').push(invariant);
    });

    // All other artifacts are grouped by category
    files.set('aliases.fsh', this.fshPackage.aliases);
    files.set('extensions.fsh', this.fshPackage.extensions);
    files.set('valueSets.fsh', this.fshPackage.valueSets);
    files.set('codeSystems.fsh', this.fshPackage.codeSystems);
    files.set('mappings.fsh', this.fshPackage.mappings);

    return files;
  }

  private cleanFileName(entityName: string): string {
    return sanitize(entityName, { replacement: '-' });
  }

  private inlineInstanceUsedIn(
    inlineInstance: ExportableInstance,
    files: Map<string, Exportable[]>
  ): string[] {
    const usedIn: string[] = [];
    files.forEach((exportables, file) => {
      exportables
        .filter(
          exportable =>
            exportable instanceof ExportableInstance ||
            exportable instanceof ExportableProfile ||
            exportable instanceof ExportableExtension ||
            exportable instanceof ExportableLogical ||
            exportable instanceof ExportableResource
        )
        .forEach(
          (
            resource:
              | ExportableInstance
              | ExportableProfile
              | ExportableExtension
              | ExportableLogical
              | ExportableResource
          ) => {
            resource.rules.forEach(rule => {
              if (
                (rule instanceof ExportableAssignmentRule ||
                  rule instanceof ExportableCaretValueRule) &&
                rule.isInstance &&
                rule.value === inlineInstance.name
              ) {
                usedIn.push(file);
              }
            });
          }
        );
    });
    return usedIn;
  }

  private invariantUsedIn(
    invariant: ExportableInvariant,
    files: Map<string, Exportable[]>
  ): string[] {
    const usedIn: string[] = [];
    files.forEach((exportables, file) => {
      exportables
        .filter(
          exportable =>
            exportable instanceof ExportableProfile ||
            exportable instanceof ExportableLogical ||
            exportable instanceof ExportableResource
        )
        .forEach((profile: ExportableProfile | ExportableLogical | ExportableResource) => {
          profile.rules.forEach(rule => {
            if (rule instanceof ExportableObeysRule && rule.keys.includes(invariant.name)) {
              usedIn.push(file);
            }
          });
        });
    });
    return usedIn;
  }
}

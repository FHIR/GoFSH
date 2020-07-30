import { EOL } from 'os';
import { Package } from '../processor';
import { ProfileExporter } from './ProfileExporter';
import { ExtensionExporter } from './ExtensionExporter';
import { CodeSystemExporter } from './CodeSystemExporter';

export class FSHExporter {
  private profileExporter: ProfileExporter;
  private extensionExporter: ExtensionExporter;
  private codeSystemExporter: CodeSystemExporter;

  constructor(public readonly fshPackage: Package) {
    this.profileExporter = new ProfileExporter();
    this.extensionExporter = new ExtensionExporter();
    this.codeSystemExporter = new CodeSystemExporter();
  }

  export(): string {
    const results: string[] = [];
    for (const profile of this.fshPackage.profiles) {
      results.push(this.profileExporter.export(profile));
    }
    for (const extension of this.fshPackage.extensions) {
      results.push(this.extensionExporter.export(extension));
    }
    for (const codeSystem of this.fshPackage.codeSystems) {
      results.push(this.codeSystemExporter.export(codeSystem));
    }

    return results.join(`${EOL}${EOL}`);
  }
}

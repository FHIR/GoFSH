import { EOL } from 'os';
import { Package } from '../processor';
import { ProfileExporter } from './ProfileExporter';
import { ExtensionExporter } from './ExtensionExporter';

export class FSHExporter {
  private profileExporter: ProfileExporter;
  private extensionExporter: ExtensionExporter;

  constructor(public readonly fshPackage: Package) {
    this.profileExporter = new ProfileExporter();
    this.extensionExporter = new ExtensionExporter();
  }

  export(): string {
    const results: string[] = [];
    for (const profile of this.fshPackage.profiles) {
      results.push(this.profileExporter.export(profile));
    }
    for (const extension of this.fshPackage.extensions) {
      results.push(this.extensionExporter.export(extension));
    }

    return results.join(`${EOL}${EOL}`);
  }
}

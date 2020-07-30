import { EOL } from 'os';
import { Package } from '../processor';

export class FSHExporter {
  constructor(public readonly fshPackage: Package) {}

  export(): string {
    const results: string[] = [];
    for (const profile of this.fshPackage.profiles) {
      results.push(profile.toFSH());
    }
    for (const extension of this.fshPackage.extensions) {
      results.push(extension.toFSH());
    }
    for (const codeSystem of this.fshPackage.codeSystems) {
      results.push(codeSystem.toFSH());
    }

    return results.join(`${EOL}${EOL}`);
  }
}

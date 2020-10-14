import { EOL } from 'os';
import { Package } from '../processor';
import { logger } from '../utils';

export class FSHExporter {
  constructor(public readonly fshPackage: Package) {}

  export(): string {
    const results: string[] = [];
    for (const profile of this.fshPackage.profiles) {
      results.push(profile.toFSH());
    }
    logger.info(
      `Exported ${this.fshPackage.profiles.length} Profile${
        this.fshPackage.profiles.length == 1 ? '' : 's'
      }.`
    );
    for (const extension of this.fshPackage.extensions) {
      results.push(extension.toFSH());
    }
    logger.info(
      `Exported ${this.fshPackage.extensions.length} Extension${
        this.fshPackage.extensions.length == 1 ? '' : 's'
      }.`
    );
    for (const codeSystem of this.fshPackage.codeSystems) {
      results.push(codeSystem.toFSH());
    }
    logger.info(
      `Exported ${this.fshPackage.codeSystems.length} CodeSystem${
        this.fshPackage.codeSystems.length == 1 ? '' : 's'
      }.`
    );
    for (const invariant of this.fshPackage.invariants) {
      results.push(invariant.toFSH());
    }
    logger.info(
      `Exported ${this.fshPackage.invariants.length} Invariant${
        this.fshPackage.invariants.length == 1 ? '' : 's'
      }.`
    );

    return results.join(`${EOL}${EOL}`);
  }
}

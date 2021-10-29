import fs from 'fs-extra';
import { ExportableAlias } from '../exportable';
import { logger } from '../utils/GoFSHLogger';

export class AliasProcessor {
  static process(aliasFile: string): ExportableAlias[] {
    const aliases: ExportableAlias[] = [];

    // Load aliases from alias-file option.
    if (this.isProcessableAliasFile(aliasFile)) {
      let aliasFileContent;
      try {
        aliasFileContent = fs.readFileSync(aliasFile, 'utf8');
      } catch (e) {
        logger.warn(`Alias file read failed with error: ${e.message}`);
      }
      if (aliasFileContent != null) {
        const matches = this.yieldAliases(aliasFileContent);
        const matchesArray = Array.from(matches);
        logger.info(matchesArray);
        matchesArray.map(match => aliases.push(ExportableAlias.fromFSH(match)));
      }
    }
    if (aliases.length == 0) {
      logger.warn(`Could not load aliases from ${aliasFile}.`);
    }

    return aliases;
  }

  // Ensures that a CodeSystem instance is fully representable using the CodeSystem syntax in FSH.
  // If there is no name or id we cannot process it.
  static isProcessableAliasFile(input: string) {
    return input != null && input.length > 0 && input.endsWith('.fsh');
  }
  static *yieldAliases(aliasFileContent: string) {
    const startsWithRegex = /^Alias:\s+(?<alias>\S+)\s+=/;
    let aliasLines: string[] = [];
    const aliasFileContentLines = aliasFileContent.split('\n');
    for (const line of aliasFileContentLines) {
      if (startsWithRegex.test(line)) {
        if (aliasLines.length > 0) {
          yield aliasLines.join('\n');
          aliasLines = [];
        }
        aliasLines.push(line);
      } else if (aliasLines.length > 0) {
        aliasLines.push(line);
      }
    }
    yield aliasLines.join('\n');
  }
}

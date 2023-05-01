import fs from 'fs-extra';
import { sushiImport } from 'fsh-sushi';
import { ExportableAlias } from '../exportable';
import { logger } from '../utils/GoFSHLogger';
import { InputStream, CommonTokenStream } from 'antlr4';
// digging up the lexer/parser so that we can implement with less code duplication
// it's a little risky, but such is the nature of the sea
import FSHLexer from 'fsh-sushi/dist/import/generated/FSHLexer';
import FSHParser from 'fsh-sushi/dist/import/generated/FSHParser';

export class AliasProcessor {
  static process(aliasFile: string): ExportableAlias[] {
    // Load aliases from alias-file option.
    if (AliasProcessor.isProcessableAliasFile(aliasFile)) {
      let aliasFileContent: string;
      try {
        aliasFileContent = fs.readFileSync(aliasFile, 'utf8');
      } catch (e) {
        logger.error(`Alias file read failed with error: ${e.message}`);
      }
      if (aliasFileContent != null) {
        const aliases = AliasProcessor.parseAliases(aliasFileContent);
        if (aliases.length === 0) {
          logger.warn(`No aliases present in ${aliasFile}.`);
        }
        return aliases;
      }
    }
    return [];
  }

  static isProcessableAliasFile(input: string) {
    return input != null && input.length > 0 && input.endsWith('.fsh');
  }

  // This implementation is more or less copied out of SUSHI to just get the aliases
  static parseAliases(aliasFileContent: string): ExportableAlias[] {
    const input = aliasFileContent.endsWith('\n') ? aliasFileContent : aliasFileContent + '\n';
    const aliases: Map<string, string> = new Map();
    // parse that fsh, citizen
    const chars = new InputStream(input);
    const lexer = new FSHLexer(chars);
    // @ts-ignore
    const tokens = new CommonTokenStream(lexer);
    const parser = new FSHParser(tokens);
    // @ts-ignore
    parser.buildParseTrees = true;
    // @ts-ignore
    const ctx = parser.doc() as sushiImport.DocContext;
    ctx.entity().forEach(entity => {
      if (entity.alias()) {
        const name = entity.alias().SEQUENCE()[0].getText();
        let value = entity.alias().SEQUENCE()[1]?.getText();
        // When the url contains a fragment (http://example.org#fragment), the grammar will read it as a
        // CODE, so we also accept that for the value here
        if (!value && entity.alias().CODE()) {
          value = entity.alias().CODE().getText();
        }
        if (name.includes('|')) {
          logger.error(
            `Alias ${name} cannot include "|" since the "|" character is reserved for indicating a version`
          );
          return;
        }
        if (aliases.has(name) && aliases.get(name) !== value) {
          logger.error(
            `Alias ${name} cannot be redefined to ${value}; it is already defined as ${aliases.get(
              name
            )}.`
          );
          // don't set it -- just keep the original definition
        } else {
          aliases.set(name, value);
        }
      }
    });
    return Array.from(aliases.entries()).map(([name, value]) => new ExportableAlias(name, value));
  }
}

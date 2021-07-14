import { EOL } from 'os';
import { fshrules } from 'fsh-sushi';
import { ExportableRule, ExportableCardRule, ExportableFlagRule, INDENT_SIZE } from '.';
import { repeat } from 'lodash';

export class ExportableContainsRule extends fshrules.ContainsRule implements ExportableRule {
  cardRules: ExportableCardRule[] = [];
  flagRules: ExportableFlagRule[] = [];
  indent = 0;

  constructor(path: string) {
    super(path);
  }

  toFSH(): string {
    const itemsWithAssociatedRules = this.items.map(item => {
      let line = '';

      // Add contains rule info
      if (item.type) {
        line += `${item.type} named ${item.name}`;
      } else {
        line += `${item.name}`;
      }

      // Add card rules for the current item
      const associatedCardRule = this.cardRules.find(r => r.path.endsWith(`[${item.name}]`));
      line += associatedCardRule ? ` ${associatedCardRule.cardToString()}` : '';

      // Add flag rules for the current item
      const associatedFlagRule = this.flagRules.find(r => r.path.endsWith(`[${item.name}]`));
      line += associatedFlagRule ? ` ${associatedFlagRule.flagsToString()}` : '';
      return line;
    });

    const spaces = repeat(' ', INDENT_SIZE * (this.indent ?? 0));

    return `${spaces}* ${this.path} contains${
      itemsWithAssociatedRules.length > 1 ? `${EOL}${spaces}    ` : ' '
    }${itemsWithAssociatedRules.join(` and${EOL}${spaces}    `)}`; // New line and indent each
  }
}

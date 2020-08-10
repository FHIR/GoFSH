import { EOL } from 'os';
import { fshrules } from 'fsh-sushi';
import { ExportableRule, ExportableCardRule, ExportableFlagRule } from '.';

export class ExportableContainsRule extends fshrules.ContainsRule implements ExportableRule {
  cardRules: ExportableCardRule[] = [];
  flagRules: ExportableFlagRule[] = [];
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
      const associatedCardRule = this.cardRules.find(r => r.path === `${this.path}[${item.name}]`);
      line += associatedCardRule ? ` ${associatedCardRule.cardToString()}` : '';

      // Add flag rules for the current item
      const associatedFlagRule = this.flagRules.find(r => r.path === `${this.path}[${item.name}]`);
      line += associatedFlagRule ? ` ${associatedFlagRule.flagsToString()}` : '';
      return line;
    });

    return `* ${this.path} contains ${itemsWithAssociatedRules.join(` and${EOL}    `)}`; // New line and indent each
  }
}

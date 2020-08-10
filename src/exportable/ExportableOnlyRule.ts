import { partition } from 'lodash';
import { fshrules } from 'fsh-sushi';
import { ExportableRule } from '.';

export class ExportableOnlyRule extends fshrules.OnlyRule implements ExportableRule {
  constructor(path: string) {
    super(path);
  }

  typeString(): string {
    const [nonReferences, references] = partition(this.types, t => !t.isReference);
    const nonReferenceString = nonReferences.map(t => t.type).join(' or ');
    const referenceString = references.length
      ? `Reference(${references.map(t => t.type).join(' or ')})`
      : '';
    return [nonReferenceString, referenceString].filter(s => s).join(' or ');
  }

  toFSH(): string {
    return `* ${this.path} only ${this.typeString()}`;
  }
}

import { utils } from 'fsh-sushi';
import { capitalize, compact } from 'lodash';
import { ExportableCodeSystem } from '../exportable';
import { CaretValueRuleExtractor } from '../extractor';

export class CodeSystemProcessor {
  static extractKeywords(input: any, target: ExportableCodeSystem): void {
    if (input.id) {
      target.id = input.id;
    }
    if (input.title) {
      target.title = input.title;
    }
    if (input.description) {
      target.description = input.description;
    }
  }

  static extractRules(input: any, target: ExportableCodeSystem, fisher: utils.Fishable): void {
    const newRules: ExportableCodeSystem['rules'] = [];
    newRules.push(...CaretValueRuleExtractor.processResource(input, fisher, input.resourceType));
    target.rules = compact(newRules);
  }

  static process(input: any, fisher: utils.Fishable): ExportableCodeSystem {
    // We need something to call the CodeSystem, so it must have a name or id
    if (input.name != null || input.id != null) {
      // Prefer name (which is optional), otherwise create a reasonable name from the id with only allowable characters
      const name = input.name ?? input.id.split(/[-.]+/).map(capitalize).join('');
      const codeSystem = new ExportableCodeSystem(name);
      CodeSystemProcessor.extractKeywords(input, codeSystem);
      CodeSystemProcessor.extractRules(input, codeSystem, fisher);
      return codeSystem;
    }
  }
}

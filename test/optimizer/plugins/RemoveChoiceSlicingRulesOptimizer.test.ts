import '../../helpers/loggerSpy'; // side-effect: suppresses logs
import { Package } from '../../../src/processor/Package';
import {
  ExportableAssignmentRule,
  ExportableCaretValueRule,
  ExportableProfile
} from '../../../src/exportable';
import optimizer from '../../../src/optimizer/plugins/RemoveChoiceSlicingRulesOptimizer';
import { fshtypes } from 'fsh-sushi';
const { FshCode } = fshtypes;

describe('optimizer', () => {
  describe('#remove_choice_slicing_rules', () => {
    it('should have appropriate metadata', () => {
      expect(optimizer.name).toBe('remove_choice_slicing_rules');
      expect(optimizer.description).toBeDefined();
      expect(optimizer.runBefore).toBeUndefined();
      expect(optimizer.runAfter).toBeUndefined();
    });

    it('should remove caret value rules on a choice element that apply standard choice slicing if one of the choices exists', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');

      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(1);
      expect(profile.rules).toContain(assignmentRule);
    });

    it('should not remove caret value rules on a choice element that apply standard choice slicing if none of the choices exist', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      const assignmentRule = new ExportableAssignmentRule('value[x].id');
      assignmentRule.value = 'special-id';

      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(5);
    });

    it('should not remove caret value rules that define slicing on a non-choice element', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('note');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('type');
      const slicingPath = new ExportableCaretValueRule('note');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = '$this';
      const slicingOrdered = new ExportableCaretValueRule('note');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('note');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(4);
    });

    it('should not remove caret value rules on a choice element that apply nonstandard choice slicing', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = true;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('closed');
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(4);
    });

    it('should not remove caret value rules on a choice element that apply some but not all of the standard choice slicing', () => {
      const profile = new ExportableProfile('SlicedProfile');
      profile.parent = 'Observation';
      const slicingType = new ExportableCaretValueRule('value[x]');
      slicingType.caretPath = 'slicing.discriminator[0].type';
      slicingType.value = new FshCode('value');
      const slicingPath = new ExportableCaretValueRule('value[x]');
      slicingPath.caretPath = 'slicing.discriminator[0].path';
      slicingPath.value = 'id';
      const slicingOrdered = new ExportableCaretValueRule('value[x]');
      slicingOrdered.caretPath = 'slicing.ordered';
      slicingOrdered.value = false;
      const slicingRules = new ExportableCaretValueRule('value[x]');
      slicingRules.caretPath = 'slicing.rules';
      slicingRules.value = new FshCode('open');

      const assignmentRule = new ExportableAssignmentRule('valueString');
      assignmentRule.value = 'Make a choice';
      profile.rules.push(slicingType, slicingPath, slicingOrdered, slicingRules, assignmentRule);
      const myPackage = new Package();
      myPackage.add(profile);
      optimizer.optimize(myPackage);
      expect(profile.rules).toHaveLength(5);
    });
  });
});

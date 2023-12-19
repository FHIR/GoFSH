import { fhirtypes, fshtypes } from 'fsh-sushi';
import { EOL } from 'os';
import { ExportableCaretValueRule } from '../../src/exportable';

describe('ExportableCaretValueRule', () => {
  it('should export a caret rule assigning a string', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'short';
    rule.value = 'Important summary';

    expect(rule.toFSH()).toBe('* ^short = "Important summary"');
  });

  it('should export a caret rule with comments', () => {
    const rule = new ExportableCaretValueRule('');
    rule.fshComment = 'I have something really important to tell you...\nJust kidding!';
    rule.caretPath = 'short';
    rule.value = 'Important summary';

    expect(rule.toFSH()).toBe(
      [
        '// I have something really important to tell you...',
        '// Just kidding!',
        '* ^short = "Important summary"'
      ].join(EOL)
    );
  });

  it('should export a caret rule assigning an instance', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'contained[0]';
    rule.isInstance = true;
    rule.value = 'Foo';

    expect(rule.toFSH()).toBe('* ^contained[0] = Foo');
  });

  it('should export a caret rule with a path', () => {
    const rule = new ExportableCaretValueRule('value[x]');
    rule.caretPath = 'definition';
    rule.value = 'This is the value';

    expect(rule.toFSH()).toBe('* value[x] ^definition = "This is the value"');
  });

  it('should export a caret rule at root path', () => {
    const rule = new ExportableCaretValueRule('.');
    rule.caretPath = 'short';
    rule.value = 'Another important summary.';

    expect(rule.toFSH()).toBe('* . ^short = "Another important summary."');
  });

  it('should export a code caret rule with a code path', () => {
    // this type of rule appears on CodeSystems
    const rule = new ExportableCaretValueRule('');
    rule.isCodeCaretRule = true;
    rule.caretPath = 'designation.value';
    rule.pathArray = ['#bear', '#brown bear'];
    rule.value = 'Brown Bear';

    expect(rule.toFSH()).toBe('* #bear #"brown bear" ^designation.value = "Brown Bear"');
  });

  it('should export a code caret rule with a code and system path', () => {
    // this type of rule appears on ValueSets
    const rule = new ExportableCaretValueRule('');
    rule.isCodeCaretRule = true;
    rule.caretPath = 'designation.value';
    rule.pathArray = ['http://example.org/zoo#brown bear'];
    // rule.fromSystem = 'http://example.org/zoo';
    rule.value = 'Brown Bear';

    expect(rule.toFSH()).toBe(
      '* http://example.org/zoo#"brown bear" ^designation.value = "Brown Bear"'
    );
  });

  it('should export a caret rule assigning a boolean', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'abstract';
    rule.value = false;

    expect(rule.toFSH()).toBe('* ^abstract = false');
  });

  it('should export a caret rule assigning a number', () => {
    const rule = new ExportableCaretValueRule('component');
    rule.caretPath = 'min';
    rule.value = 1;

    expect(rule.toFSH()).toBe('* component ^min = 1');
  });

  it('should export a caret rule assigning a FshCanonical', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'url';
    rule.value = new fshtypes.FshCanonical('Observation');

    expect(rule.toFSH()).toBe('* ^url = Canonical(Observation)');
  });

  it('should export a caret rule assigning a FshCanonical with a version', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'url';
    rule.value = new fshtypes.FshCanonical('Example');
    rule.value.version = '1.2.3';

    expect(rule.toFSH()).toBe('* ^url = Canonical(Example|1.2.3)');
  });

  it('should export a caret rule assigning a FshCode with just a code', () => {
    const rule = new ExportableCaretValueRule('component');
    rule.caretPath = 'slicing.rules';
    rule.value = new fshtypes.FshCode('open');

    expect(rule.toFSH()).toBe('* component ^slicing.rules = #open');
  });

  it('should export a caret rule assigning a FshCode with a code and system', () => {
    const rule = new ExportableCaretValueRule('component');
    rule.caretPath = 'slicing.rules';
    rule.value = new fshtypes.FshCode('open', 'http://foo.com');

    expect(rule.toFSH()).toBe('* component ^slicing.rules = http://foo.com#open');
  });

  it('should export a caret rule assigning a FshCode with a code, system, and display', () => {
    const rule = new ExportableCaretValueRule('component');
    rule.caretPath = 'slicing.rules';
    rule.value = new fshtypes.FshCode('open', 'http://foo.com', 'Display Text');

    expect(rule.toFSH()).toBe('* component ^slicing.rules = http://foo.com#open "Display Text"');
  });

  it('should export a caret rule assigning a FshQuantity', () => {
    const rule = new ExportableCaretValueRule('value[x]');
    rule.caretPath = 'maxValueQuantity';
    rule.value = new fshtypes.FshQuantity(15);

    expect(rule.toFSH()).toBe('* value[x] ^maxValueQuantity = 15');
  });

  it('should export a caret rule assigning a FshQuantity with a unit', () => {
    const rule = new ExportableCaretValueRule('value[x]');
    rule.caretPath = 'maxValueQuantity';
    const mm = new fshtypes.FshCode('mm', 'http://unitsofmeasure.org');
    rule.value = new fshtypes.FshQuantity(15, mm);

    expect(rule.toFSH()).toBe("* value[x] ^maxValueQuantity = 15 'mm'");
  });

  it('should export a caret rule assigning a FshRatio', () => {
    const rule = new ExportableCaretValueRule('value[x]');
    rule.caretPath = 'patternRatio';
    const numerator = new fshtypes.FshQuantity(130);
    const denominator = new fshtypes.FshQuantity(1);
    rule.value = new fshtypes.FshRatio(numerator, denominator);

    expect(rule.toFSH()).toBe('* value[x] ^patternRatio = 130 : 1');
  });

  it('should export a caret rule assigning a FshRatio with units', () => {
    const rule = new ExportableCaretValueRule('value[x]');
    rule.caretPath = 'patternRatio';
    const mg = new fshtypes.FshCode('mg', 'http://unitsofmeasure.org');
    const numerator = new fshtypes.FshQuantity(130, mg);
    const dL = new fshtypes.FshCode('dL', 'http://unitsofmeasure.org');
    const denominator = new fshtypes.FshQuantity(1, dL);
    rule.value = new fshtypes.FshRatio(numerator, denominator);

    expect(rule.toFSH()).toBe("* value[x] ^patternRatio = 130 'mg' : 1 'dL'");
  });

  it('should export a caret rule assigning a FshReference', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'url';
    rule.value = new fshtypes.FshReference('Example');

    expect(rule.toFSH()).toBe('* ^url = Reference(Example)');
  });

  it('should export a caret rule assigning a FshReference with display', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'url';
    rule.value = new fshtypes.FshReference('Example', 'My Example');

    expect(rule.toFSH()).toBe('* ^url = Reference(Example) "My Example"');
  });

  it('should export a caret rule assigning an InstanceDefinition', () => {
    const rule = new ExportableCaretValueRule('');
    rule.caretPath = 'contact';
    rule.value = new fhirtypes.InstanceDefinition();
    rule.value._instanceMeta.name = 'MyContact';

    expect(rule.toFSH()).toBe('* ^contact = MyContact');
  });

  it('should export an indented caret rule', () => {
    const rule = new ExportableCaretValueRule('component');
    rule.caretPath = 'slicing.rules';
    rule.value = new fshtypes.FshCode('open', 'http://foo.com', 'Display Text');
    rule.indent = 2;

    expect(rule.toFSH()).toBe(
      '    * component ^slicing.rules = http://foo.com#open "Display Text"'
    );
  });
});

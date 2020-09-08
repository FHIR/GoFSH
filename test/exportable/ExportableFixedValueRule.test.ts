import { ExportableFixedValueRule } from '../../src/exportable';
import { fshtypes, fhirtypes } from 'fsh-sushi';
import { FshCode } from 'fsh-sushi/dist/fshtypes';

describe('ExportableFixedValueRule', () => {
  it('should export a FixedValueRule with a value that matches exactly', () => {
    const rule = new ExportableFixedValueRule('valueInteger');
    rule.fixedValue = 5;
    rule.exactly = true;
    expect(rule.toFSH()).toEqual('* valueInteger = 5 (exactly)');
  });

  it('should export a FixedValueRule with a boolean value', () => {
    const rule = new ExportableFixedValueRule('valueBoolean');
    rule.fixedValue = true;
    expect(rule.toFSH()).toEqual('* valueBoolean = true');
  });

  it('should export a FixedValueRule with a number value', () => {
    const rule = new ExportableFixedValueRule('valueDecimal');
    rule.fixedValue = 1.21;
    expect(rule.toFSH()).toEqual('* valueDecimal = 1.21');
  });

  it('should export a FixedValueRule with a string value', () => {
    const rule = new ExportableFixedValueRule('note.text');
    rule.fixedValue = 'This is the \\"note text\\".\\nThis is the second line.';
    expect(rule.toFSH()).toEqual(
      '* note.text = "This is the \\"note text\\".\\nThis is the second line."'
    );
  });

  it('should export a FixedValueRule with a FshCode value for a code element', () => {
    const rule = new ExportableFixedValueRule('status');
    rule.fixedValue = new fshtypes.FshCode('final');
    expect(rule.toFSH()).toEqual('* status = #final');
  });

  it('should export a FixedValueRule with a FshCode value for a CodeableConcept element', () => {
    const rule = new ExportableFixedValueRule('code');
    rule.fixedValue = new fshtypes.FshCode(
      '573',
      'http://example.com/codes',
      'speed setting \\"high\\"'
    );
    expect(rule.toFSH()).toEqual(
      '* code = http://example.com/codes#573 "speed setting \\"high\\""'
    );
  });

  it('should export a FixedValueRule with a FshQuantity value', () => {
    const rule = new ExportableFixedValueRule('valueQuantity');
    rule.fixedValue = new fshtypes.FshQuantity(
      1.21,
      new FshCode('GW', 'http://unitsofmeasure.org')
    );
    expect(rule.toFSH()).toEqual("* valueQuantity = 1.21 'GW'");
  });

  it('should export a FixedValueRule with a FshRatio value', () => {
    const rule = new ExportableFixedValueRule('valueRatio');
    rule.fixedValue = new fshtypes.FshRatio(
      new fshtypes.FshQuantity(5, new fshtypes.FshCode('cm', 'http://unitsofmeasure.org')),
      new fshtypes.FshQuantity(1, new fshtypes.FshCode('s', 'http://unitsofmeasure.org'))
    );
    expect(rule.toFSH()).toEqual("* valueRatio = 5 'cm' : 1 's'");
  });

  it('should export a FixedValueRule with a FshReference value', () => {
    const rule = new ExportableFixedValueRule('subject');
    rule.fixedValue = new fshtypes.FshReference('http://example.com/PaulBunyan', 'Paul Bunyan');
    expect(rule.toFSH()).toEqual(
      '* subject = Reference(http://example.com/PaulBunyan) "Paul Bunyan"'
    );
  });

  it('should export a FixedValueRule with an InstanceDefinition value', () => {
    const rule = new ExportableFixedValueRule('note');
    const fixedValue = new fhirtypes.InstanceDefinition();
    fixedValue.resourceType = 'Annotation';
    fixedValue.id = 'Annotation0';
    rule.fixedValue = fixedValue;
    rule.isInstance = true;
    expect(rule.toFSH()).toEqual('* note = Annotation0');
  });
});

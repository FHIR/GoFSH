import { ExportableAssignmentRule } from '../../src/exportable';
import { fshtypes, fhirtypes } from 'fsh-sushi';
import { FshCode } from 'fsh-sushi/dist/fshtypes';

describe('ExportableAssignmentRule', () => {
  it('should export a AssignmentRule with a value that matches exactly', () => {
    const rule = new ExportableAssignmentRule('valueInteger');
    rule.value = 5;
    rule.exactly = true;
    expect(rule.toFSH()).toEqual('* valueInteger = 5 (exactly)');
  });

  it('should export a AssignmentRule with a boolean value', () => {
    const rule = new ExportableAssignmentRule('valueBoolean');
    rule.value = true;
    expect(rule.toFSH()).toEqual('* valueBoolean = true');
  });

  it('should export a AssignmentRule with a number value', () => {
    const rule = new ExportableAssignmentRule('valueDecimal');
    rule.value = 1.21;
    expect(rule.toFSH()).toEqual('* valueDecimal = 1.21');
  });

  it('should export a AssignmentRule with a bigint value', () => {
    const rule = new ExportableAssignmentRule('valueInteger64');
    rule.value = BigInt('9223372036854775807');
    expect(rule.toFSH()).toEqual('* valueInteger64 = 9223372036854775807');
  });

  it('should export a AssignmentRule with a string value', () => {
    const rule = new ExportableAssignmentRule('note.text');
    rule.value = 'This is the "note text".\nThis is the second line.';
    expect(rule.toFSH()).toEqual(
      '* note.text = "This is the \\"note text\\".\\nThis is the second line."'
    );
  });

  it('should export a AssignmentRule with a FshCode value for a code element', () => {
    const rule = new ExportableAssignmentRule('status');
    rule.value = new fshtypes.FshCode('final');
    expect(rule.toFSH()).toEqual('* status = #final');
  });

  it('should export a AssignmentRule with a FshCode value for a CodeableConcept element', () => {
    const rule = new ExportableAssignmentRule('code');
    rule.value = new fshtypes.FshCode(
      '573',
      'http://example.com/codes',
      'speed setting \\"high\\"'
    );
    expect(rule.toFSH()).toEqual(
      '* code = http://example.com/codes#573 "speed setting \\"high\\""'
    );
  });

  it('should export a AssignmentRule with a FshQuantity value', () => {
    const rule = new ExportableAssignmentRule('valueQuantity');
    rule.value = new fshtypes.FshQuantity(1.21, new FshCode('GW', 'http://unitsofmeasure.org'));
    expect(rule.toFSH()).toEqual("* valueQuantity = 1.21 'GW'");
  });

  it('should export a AssignmentRule with a FshRatio value', () => {
    const rule = new ExportableAssignmentRule('valueRatio');
    rule.value = new fshtypes.FshRatio(
      new fshtypes.FshQuantity(5, new fshtypes.FshCode('cm', 'http://unitsofmeasure.org')),
      new fshtypes.FshQuantity(1, new fshtypes.FshCode('s', 'http://unitsofmeasure.org'))
    );
    expect(rule.toFSH()).toEqual("* valueRatio = 5 'cm' : 1 's'");
  });

  it('should export a AssignmentRule with a FshReference value', () => {
    const rule = new ExportableAssignmentRule('subject');
    rule.value = new fshtypes.FshReference('http://example.com/PaulBunyan', 'Paul Bunyan');
    expect(rule.toFSH()).toEqual(
      '* subject = Reference(http://example.com/PaulBunyan) "Paul Bunyan"'
    );
  });

  it('should export a AssignmentRule with an InstanceDefinition value', () => {
    const rule = new ExportableAssignmentRule('note');
    const value = new fhirtypes.InstanceDefinition();
    value.resourceType = 'Annotation';
    value.id = 'Annotation0';
    rule.value = value;
    rule.isInstance = true;
    expect(rule.toFSH()).toEqual('* note = Annotation0');
  });
});

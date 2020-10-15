import { fshtypes } from 'fsh-sushi';
import { ExportableMappingRule } from '../../src/exportable';

describe('ExportableMappingRule', () => {
  it('should export a basic mapping rule', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.otherIdentifier';

    expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier"');
  });

  it('should export a mapping rule with no path', () => {
    const rule = new ExportableMappingRule('');
    rule.map = 'Patient';

    expect(rule.toFSH()).toBe('* -> "Patient"');
  });

  it('should export a mapping rule with a comment', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.otherIdentifier';
    rule.comment = 'This is a comment';

    expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier" "This is a comment"');
  });

  it('should export a mapping rule with a language', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.otherIdentifier';
    rule.language = new fshtypes.FshCode('lang');

    expect(rule.toFSH()).toBe('* identifier -> "Patient.otherIdentifier" #lang');
  });

  it('should export a mapping rule with a comment and target', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.otherIdentifier';
    rule.comment = 'This is a comment';
    rule.language = new fshtypes.FshCode('lang');

    expect(rule.toFSH()).toBe(
      '* identifier -> "Patient.otherIdentifier" "This is a comment" #lang'
    );
  });

  it('should export a mapping rule with a map that contains characters that are escaped in FSH', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.\\somethingFu\nnky';

    expect(rule.toFSH()).toBe('* identifier -> "Patient.\\\\somethingFu\\nnky"');
  });

  it('should export a mapping rule with a comment that contains characters that are escaped in FSH', () => {
    const rule = new ExportableMappingRule('identifier');
    rule.map = 'Patient.otherIdentifier';
    rule.comment = 'This has a \n newline, which is pretty \\wild.';

    expect(rule.toFSH()).toBe(
      '* identifier -> "Patient.otherIdentifier" "This has a \\n newline, which is pretty \\\\wild."'
    );
  });
});

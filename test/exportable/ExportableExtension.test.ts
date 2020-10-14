import { EOL } from 'os';
import {
  ExportableExtension,
  ExportableCardRule,
  ExportableFlagRule,
  ExportableBindingRule,
  ExportableObeysRule
} from '../../src/exportable';

describe('ExportableExtension', () => {
  it('should export the simplest extension', () => {
    const input = new ExportableExtension('SimpleExtension');

    const expectedResult = ['Extension: SimpleExtension', 'Id: SimpleExtension'].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with additional metadata', () => {
    const input = new ExportableExtension('MyExtension');
    input.parent = 'Extension';
    input.id = 'my-extension';
    input.title = 'My Extension';
    input.description = 'My extension is not very extensive.';

    const expectedResult = [
      'Extension: MyExtension',
      // NOTE: Since parent is Extension, it is omitted from FSH
      'Id: my-extension',
      'Title: "My Extension"',
      'Description: "My extension is not very extensive."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with additional metadata without extension url as Parent', () => {
    const input = new ExportableExtension('MyExtension');
    input.parent = 'http://hl7.org/fhir/StructureDefinition/Extension'; // baseDefinition of Extension StructureDefinition
    input.id = 'my-extension';
    input.title = 'My Extension';
    input.description = 'This extension will not have the Extension URL as the parent.';

    const expectedResult = [
      'Extension: MyExtension',
      // NOTE: Since parent is Extension baseDefinition, it is omitted from FSH
      'Id: my-extension',
      'Title: "My Extension"',
      'Description: "This extension will not have the Extension URL as the parent."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an extension extending another extension', () => {
    const input = new ExportableExtension('MyExtension');
    input.parent = 'ParentExtension';
    input.id = 'my-extension';
    input.title = 'My Extension';
    input.description = 'My extension extending ParentExtension.';

    const expectedResult = [
      'Extension: MyExtension',
      'Parent: ParentExtension',
      'Id: my-extension',
      'Title: "My Extension"',
      'Description: "My extension extending ParentExtension."'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with metadata that contains characters that are escaped in FSH', () => {
    const input = new ExportableExtension('NewlineExtension');
    input.id = 'newline-extension';
    input.description =
      'This description\nhas a newline in it. Is that \\not allowed\\? Is that "not okay"?';

    const expectedResult = [
      'Extension: NewlineExtension',
      'Id: newline-extension',
      'Description: "This description\\nhas a newline in it. Is that \\\\not allowed\\\\? Is that \\"not okay\\"?"'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });

  it('should export an extension with rules', () => {
    const input = new ExportableExtension('MyExtension');

    const cardRule = new ExportableCardRule('extension');
    cardRule.min = 0;
    cardRule.max = '0';
    input.rules.push(cardRule);

    const flagRule = new ExportableFlagRule('value[x]');
    flagRule.mustSupport = true;
    flagRule.summary = true;
    input.rules.push(flagRule);

    const bindingRule = new ExportableBindingRule('value[x]');
    bindingRule.valueSet = 'http://example.org/ValueSet/Foo';
    bindingRule.strength = 'required';
    input.rules.push(bindingRule);

    const obeysRule = new ExportableObeysRule('.');
    obeysRule.keys = ['myx-1', 'myx-2'];
    input.rules.push(obeysRule);

    const expectedResult = [
      'Extension: MyExtension',
      'Id: MyExtension',
      '* extension 0..0',
      '* value[x] MS SU',
      '* value[x] from http://example.org/ValueSet/Foo (required)',
      '* obeys myx-1 and myx-2'
    ].join(EOL);
    const result = input.toFSH();
    expect(result).toBe(expectedResult);
  });
});

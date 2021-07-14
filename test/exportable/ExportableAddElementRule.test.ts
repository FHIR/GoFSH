import { ExportableAddElementRule } from '../../src/exportable';

describe('ExportableAddElementRule', () => {
  it('should export an indented add element rule', () => {
    const rule = new ExportableAddElementRule('cookie');
    rule.min = 1;
    rule.max = '7';
    rule.short = 'cookie';
    rule.definition = 'Cookies are a critical component of this resource.';
    rule.types.push({ type: 'string' }, { type: 'CodeableConcept' });
    rule.mustSupport = true;
    rule.indent = 1;

    expect(rule.toFSH()).toBe(
      '  * cookie 1..7 MS string or CodeableConcept "cookie" "Cookies are a critical component of this resource."'
    );
  });
});

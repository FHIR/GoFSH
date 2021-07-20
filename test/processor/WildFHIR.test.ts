import { WildFHIR } from '../../src/processor';

describe('WildFHIR', () => {
  describe('#constructor', () => {
    it('should set properties correctly when both are provided', () => {
      const myRawFHIR = new WildFHIR(
        { content: { resourceType: 'Patient' } },
        '/path/to/patient.json'
      );
      expect(myRawFHIR.content).toEqual({ resourceType: 'Patient' });
      expect(myRawFHIR.path).toBe('/path/to/patient.json');
    });

    it('should set empty path when no path is provided', () => {
      const myRawFHIR = new WildFHIR({ content: { resourceType: 'Patient' } });
      expect(myRawFHIR.content).toEqual({ resourceType: 'Patient' });
      expect(myRawFHIR.path).toBe('');
    });
  });
});

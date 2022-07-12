import childProcess from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { fshingTrip, getLakeOfFHIR } from '../../src/utils';

describe('fshingTrip', () => {
  let execSyncSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;
  let writeFileSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    execSyncSpy = jest.spyOn(childProcess, 'execSync').mockImplementation();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
  });

  beforeEach(() => {
    execSyncSpy.mockClear();
    consoleSpy.mockClear();
    writeFileSyncSpy.mockClear();
  });

  it('should run SUSHI with npx when useLocalSUSHI is false', () => {
    const inDir = path.join(__dirname, 'fixtures', 'fshing-trip-input');
    const outDir = path.join(__dirname, 'fixtures', 'fshing-trip-output');
    const lake = getLakeOfFHIR(inDir, 'json-only');
    fshingTrip(inDir, outDir, lake, false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `npx sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
  });

  it('should run SUSHI using the local install when useLocalSUSHI is true', () => {
    const inDir = path.join(__dirname, 'fixtures', 'fshing-trip-input');
    const outDir = path.join(__dirname, 'fixtures', 'fshing-trip-output');
    const lake = getLakeOfFHIR(inDir, 'json-only');
    fshingTrip(inDir, outDir, lake, true);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
  });

  it('should correctly generate a temporary differential file', () => {
    const inDir = path.join(__dirname, 'fixtures', 'fshing-trip-input');
    const outDir = path.join(__dirname, 'fixtures', 'fshing-trip-output');
    const lake = getLakeOfFHIR(inDir, 'json-only');
    fshingTrip(inDir, outDir, lake, false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `npx sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSyncSpy.mock.calls[0][0]).toMatch(/fshing-trip-comparison\.html/);
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(/Files changed \(3\)/);
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/\{fshing-trip-input → fshing-trip-output\}\/Observation-some-observation.json/
    );
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/\{fshing-trip-input → fshing-trip-output\}\/Patient-some-patient.json/
    );
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/\{fshing-trip-input → fshing-trip-output\}\/Practitioner-some-practitioner.json/
    );
  });

  it('should correctly generate a temporary differential file when input file names are arbitrary', () => {
    const inDir = path.join(__dirname, 'fixtures', 'fshing-trip-arbitrary-input');
    const outDir = path.join(__dirname, 'fixtures', 'fshing-trip-output');
    const lake = getLakeOfFHIR(inDir, 'json-only');
    fshingTrip(inDir, outDir, lake, false);
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `npx sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSyncSpy.mock.calls[0][0]).toMatch(/fshing-trip-comparison\.html/);
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(/Files changed \(3\)/);
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/\{fshing-trip-arbitrary-input\/observe-this-punk.json → fshing-trip-output\/Observation-some-observation.json\}/
    );
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/\{fshing-trip-arbitrary-input\/all-you-need-is-just-a-little-patients.json → fshing-trip-output\/Patient-some-patient.json\}/
    );
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(
      /test\/utils\/fixtures\/{fshing-trip-arbitrary-input → fshing-trip-output}\/Practitioner-some-practitioner.json/
    );
  });
});

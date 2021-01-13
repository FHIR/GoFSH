import childProcess from 'child_process';
import path from 'path';
import temp from 'temp';
import fs from 'fs-extra';
import '../helpers/loggerSpy'; // side-effect: suppresses logs
import { fshingTrip } from '../../src/utils';

describe('fshingTrip', () => {
  let execSyncSpy: jest.SpyInstance;
  let consoleSpy: jest.SpyInstance;
  let trackSpy: jest.SpyInstance;
  let openSyncSpy: jest.SpyInstance;
  let appendFileSyncSpy: jest.SpyInstance;
  let writeFileSyncSpy: jest.SpyInstance;

  beforeAll(() => {
    execSyncSpy = jest.spyOn(childProcess, 'execSync').mockImplementation();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    trackSpy = jest.spyOn(temp, 'track').mockImplementation();
    openSyncSpy = jest.spyOn(temp, 'openSync').mockImplementation(() => {
      return { fd: 1, path: 'foo.diff' };
    });
    appendFileSyncSpy = jest.spyOn(fs, 'appendFileSync').mockImplementation();
    writeFileSyncSpy = jest.spyOn(fs, 'writeFileSync').mockImplementation();
  });

  beforeEach(() => {
    execSyncSpy.mockClear();
    consoleSpy.mockClear();
    trackSpy.mockClear();
    openSyncSpy.mockClear();
    appendFileSyncSpy.mockClear();
    writeFileSyncSpy.mockClear();
    // mock out readFileSync so diff2html doesn't throw
    jest
      .spyOn(fs, 'readFileSync')
      .mockImplementationOnce(() => '') // foo.diff
      .mockImplementationOnce(() => '<!--diff2html-diff-->'); // template.html
  });

  it('should run SUSHI with npx when useLocalSUSHI is false', () => {
    fshingTrip(
      path.join(__dirname, 'fixtures', 'fshing-trip-input'),
      path.join(__dirname, 'fixtures', 'fshing-trip-output'),
      false
    );
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `npx sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
  });

  it('should run SUSHI using the local install when useLocalSUSHI is true', () => {
    fshingTrip(
      path.join(__dirname, 'fixtures', 'fshing-trip-input'),
      path.join(__dirname, 'fixtures', 'fshing-trip-output'),
      true
    );
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
  });

  it('should correctly generate a temporary differential file', () => {
    fshingTrip(
      path.join(__dirname, 'fixtures', 'fshing-trip-input'),
      path.join(__dirname, 'fixtures', 'fshing-trip-output'),
      false
    );
    expect(execSyncSpy).toHaveBeenCalledTimes(1);
    expect(execSyncSpy.mock.calls[0][0]).toBe(
      `npx sushi ${path.join(__dirname, 'fixtures', 'fshing-trip-output')}`
    );
    expect(trackSpy).toHaveBeenCalledTimes(1);
    expect(openSyncSpy).toHaveBeenCalledTimes(1);
    expect(openSyncSpy.mock.calls[0][0]).toEqual({ suffix: '.diff' });
    expect(appendFileSyncSpy).toHaveBeenCalledTimes(3);
    expect(appendFileSyncSpy.mock.calls[0][1]).toMatch(/observation\.json/);
    expect(appendFileSyncSpy.mock.calls[1][1]).toMatch(/profiled-patient.*different-profile/s);
    expect(appendFileSyncSpy.mock.calls[2][1]).toMatch(/practitioner\.json/);
    expect(writeFileSyncSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSyncSpy.mock.calls[0][0]).toMatch(/fshing-trip-comparison\.html/);
    expect(writeFileSyncSpy.mock.calls[0][1]).toMatch(/Files changed \(0\)/);
  });
});

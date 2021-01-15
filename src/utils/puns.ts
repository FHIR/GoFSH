import { sample } from 'lodash';

// NOTE: We originally planned to re-use puns from SUSHI, but that didn't seem appropriate
// since errors in GoFSH may not be the user's fault (and many SUSHI puns blame the user).
// Puns must be 37 characters or less.

export const CLEAN_RUN_PUNS = [
  'Plenty of FSH in the sea!',
  'O-fish-ally error free!',
  'Cool and So-fish-ticated!',
  'Everything is ship-shape!',
  "That's some fin-tastic FSH!",
  'This is dolphinitely going well!',
  'It doesn’t get any betta than this!'
];

export const WARNING_PUNS = [
  'Not bad, but it cod be batter!',
  'Something smells fishy...',
  'Warnings... Water those about?',
  'A bit pitchy, but may be tuna-ble.',
  'Uh oh. Do you sea any problems?'
];

export const ERROR_PUNS = [
  'Ick! Errors!',
  'Some-fin went wrong...',
  'Unfor-tuna-tely, there are errors.',
  'That really smelt.',
  'You spawned some errors.',
  'This is the one that got away.',
  'This was a turtle disaster.',
  'Something went eely wrong there.',
  'Call a FSH sturgeon!'
];

export function getRandomPun(numErrors = 0, numWarnings = 0): string {
  const puns = numErrors > 0 ? ERROR_PUNS : numWarnings > 0 ? WARNING_PUNS : CLEAN_RUN_PUNS;
  return sample(puns);
}

import { sample } from 'lodash';

// Creatures must be 13 characters or less
export const SEA_CREATURES = [
  'Dolphins',
  'Narwhals',
  'Sea Monkeys',
  'Plankton',
  'Monk Seals',
  'Isopods',
  'Cuttlefish',
  'Giant Squids',
  'Megalodons',
  'Sea Cucumbers',
  'Sea Otters'
];

// Actions must be 10 characters or less
export const GOOD_ACTIONS = ['adopted', 'cuddled', 'hugged'];
export const BAD_ACTIONS = ['harmed', 'insulted', 'lost'];

export function getRandomSeaCreatures(): string {
  return sample(SEA_CREATURES);
}

export function getRandomSeaCreaturesStat(numErrors = 0, numWarnings = 0): string {
  const num = Math.floor(Math.random() * 99 + 1);
  return `${num} ${sample(numErrors || numWarnings ? BAD_ACTIONS : GOOD_ACTIONS)}`;
}

import { VibrationPattern } from '../../src/settings/types';

export const mapPatternToMs = (pattern: VibrationPattern): number[] => {
  switch (pattern) {
    case 'short':
      return [0];
    case 'pulse':
      return [0, 500, 1000];
    case 'wave':
      return [0, 300, 600, 900];
    default:
      return [0];
  }
};

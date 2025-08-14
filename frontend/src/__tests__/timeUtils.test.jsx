import { describe, it, expect } from 'vitest';
import { formatCountdown } from '../logic/timeUtils';

describe('formatCountdown', () => {
  it('formats mm:ss', () => {
    expect(formatCountdown(125000)).toBe('2:05');
  });
  it('clamps negative', () => {
    expect(formatCountdown(-100)).toBe('0:00');
  });
});

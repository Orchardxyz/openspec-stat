import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getDefaultTimeRange, parseDateTime, parseBranches } from '../../time-utils';

describe('time-utils', () => {
  describe('parseDateTime', () => {
    it('should parse valid ISO date string', () => {
      const result = parseDateTime('2024-01-15T10:00:00Z');
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should parse valid date string in different formats', () => {
      const result = parseDateTime('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0);
      expect(result.getDate()).toBe(15);
    });

    it('should throw error for invalid date string', () => {
      expect(() => parseDateTime('invalid-date')).toThrow('Invalid date format: invalid-date');
    });

    it('should throw error for empty string', () => {
      expect(() => parseDateTime('')).toThrow('Invalid date format: ');
    });

    it('should handle date with time', () => {
      const result = parseDateTime('2024-01-15 14:30:00');
      expect(result).toBeInstanceOf(Date);
      expect(result.getHours()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('parseBranches', () => {
    it('should parse comma-separated branches', () => {
      expect(parseBranches('main,develop,feature')).toEqual(['main', 'develop', 'feature']);
    });

    it('should trim whitespace from branches', () => {
      expect(parseBranches(' main , develop , feature ')).toEqual(['main', 'develop', 'feature']);
    });

    it('should return empty array for empty string', () => {
      expect(parseBranches('')).toEqual([]);
    });

    it('should return empty array for undefined', () => {
      expect(parseBranches(undefined)).toEqual([]);
    });

    it('should filter out empty strings after split', () => {
      expect(parseBranches('main,,develop,,,feature')).toEqual(['main', 'develop', 'feature']);
    });

    it('should handle single branch', () => {
      expect(parseBranches('main')).toEqual(['main']);
    });

    it('should handle branches with special characters', () => {
      expect(parseBranches('origin/main,origin/develop,feature/test-123')).toEqual([
        'origin/main',
        'origin/develop',
        'feature/test-123',
      ]);
    });

    it('should handle whitespace-only strings', () => {
      expect(parseBranches('   ,   ,   ')).toEqual([]);
    });
  });

  describe('getDefaultTimeRange', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('should return date range with default hours', () => {
      const testDate = new Date('2024-01-15T15:00:00Z');
      vi.setSystemTime(testDate);

      const { since, until } = getDefaultTimeRange();

      expect(since).toBeInstanceOf(Date);
      expect(until).toBeInstanceOf(Date);
      expect(since.getTime()).toBeLessThan(until.getTime());
    });

    it('should use custom hours when provided', () => {
      const testDate = new Date('2024-01-15T15:00:00Z');
      vi.setSystemTime(testDate);

      const { since, until } = getDefaultTimeRange(-48, 18);

      expect(since).toBeInstanceOf(Date);
      expect(until).toBeInstanceOf(Date);
      expect(since.getHours()).toBe(18);
      expect(until.getHours()).toBe(18);
    });

    it('should set time to specified hour with zero minutes and seconds', () => {
      const testDate = new Date('2024-01-15T15:30:45Z');
      vi.setSystemTime(testDate);

      const { since, until } = getDefaultTimeRange(-30, 20);

      expect(since.getMinutes()).toBe(0);
      expect(since.getSeconds()).toBe(0);
      expect(until.getMinutes()).toBe(0);
      expect(until.getSeconds()).toBe(0);
    });

    it('should return yesterday and today dates', () => {
      const testDate = new Date('2024-01-15T15:00:00Z');
      vi.setSystemTime(testDate);

      const { since, until } = getDefaultTimeRange();

      const dayDiff = Math.floor((until.getTime() - since.getTime()) / (1000 * 60 * 60 * 24));
      expect(dayDiff).toBe(1);
    });

    vi.useRealTimers();
  });
});

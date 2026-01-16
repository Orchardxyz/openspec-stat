import { describe, it, expect, afterEach, vi } from 'vitest';
import { normalizeAuthor, loadConfig } from '../../config';
import mockFs from 'mock-fs';

describe('config', () => {
  describe('normalizeAuthor', () => {
    it('should return original author when no mapping exists', () => {
      expect(normalizeAuthor('John Doe')).toBe('John Doe');
    });

    it('should normalize author using mapping', () => {
      const mapping = { 'john.doe@email.com': 'John Doe' };
      expect(normalizeAuthor('john.doe@email.com', mapping)).toBe('John Doe');
    });

    it('should handle empty mapping', () => {
      expect(normalizeAuthor('Jane Doe', {})).toBe('Jane Doe');
    });

    it('should handle multiple mappings', () => {
      const mapping = {
        'john.doe@email.com': 'John Doe',
        'jane.smith@email.com': 'Jane Smith',
        bob: 'Robert Johnson',
      };
      expect(normalizeAuthor('john.doe@email.com', mapping)).toBe('John Doe');
      expect(normalizeAuthor('jane.smith@email.com', mapping)).toBe('Jane Smith');
      expect(normalizeAuthor('bob', mapping)).toBe('Robert Johnson');
    });

    it('should return original author if not in mapping', () => {
      const mapping = { 'john.doe@email.com': 'John Doe' };
      expect(normalizeAuthor('unknown.user@email.com', mapping)).toBe('unknown.user@email.com');
    });

    it('should handle undefined mapping', () => {
      expect(normalizeAuthor('John Doe', undefined)).toBe('John Doe');
    });
  });

  describe('loadConfig', () => {
    afterEach(() => {
      mockFs.restore();
    });

    it('should return default config when no config file exists', async () => {
      mockFs({
        '/test-repo': {},
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config).toEqual({
        defaultBranches: ['origin/master'],
        defaultSinceHours: -30,
        defaultUntilHours: 20,
        authorMapping: {},
        openspecDir: 'openspec/',
        excludeExtensions: ['.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'],
        activeUserWeeks: 2,
      });

      mockFs.restore();
    });

    it('should load config from .openspec-stats.json in repo path', async () => {
      const customConfig = {
        defaultBranches: ['origin/main', 'origin/develop'],
        defaultSinceHours: -48,
        authorMapping: { john: 'John Doe' },
      };

      mockFs({
        '/test-repo': {
          '.openspec-stats.json': JSON.stringify(customConfig),
        },
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config.defaultBranches).toEqual(['origin/main', 'origin/develop']);
      expect(config.defaultSinceHours).toBe(-48);
      expect(config.authorMapping).toEqual({ john: 'John Doe' });
      expect(config.defaultUntilHours).toBe(20);

      mockFs.restore();
    });

    it('should merge custom config with defaults', async () => {
      const customConfig = {
        defaultBranches: ['origin/main'],
      };

      mockFs({
        '/test-repo': {
          '.openspec-stats.json': JSON.stringify(customConfig),
        },
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config.defaultBranches).toEqual(['origin/main']);
      expect(config.defaultSinceHours).toBe(-30);
      expect(config.defaultUntilHours).toBe(20);
      expect(config.openspecDir).toBe('openspec/');

      mockFs.restore();
    });

    it('should load config from custom path when provided', async () => {
      const customConfig = {
        defaultBranches: ['custom/branch'],
        activeUserWeeks: 4,
      };

      mockFs({
        '/custom/path': {
          'my-config.json': JSON.stringify(customConfig),
        },
      });

      const config = await loadConfig('/custom/path/my-config.json', '/test-repo');

      expect(config.defaultBranches).toEqual(['custom/branch']);
      expect(config.activeUserWeeks).toBe(4);

      mockFs.restore();
    });

    it('should handle invalid JSON gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      mockFs({
        '/test-repo': {
          '.openspec-stats.json': 'invalid json {{{',
        },
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config).toEqual({
        defaultBranches: ['origin/master'],
        defaultSinceHours: -30,
        defaultUntilHours: 20,
        authorMapping: {},
        openspecDir: 'openspec/',
        excludeExtensions: ['.md', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp'],
        activeUserWeeks: 2,
      });

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();

      mockFs.restore();
    });

    it('should prioritize openspec-stats.config.json over .openspec-stats.json', async () => {
      const config1 = { defaultBranches: ['branch1'] };
      const config2 = { defaultBranches: ['branch2'] };

      mockFs({
        '/test-repo': {
          '.openspec-stats.json': JSON.stringify(config1),
          'openspec-stats.config.json': JSON.stringify(config2),
        },
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config.defaultBranches).toEqual(['branch1']);

      mockFs.restore();
    });

    it('should handle all config options', async () => {
      const fullConfig = {
        defaultBranches: ['origin/main'],
        defaultSinceHours: -72,
        defaultUntilHours: 18,
        authorMapping: { dev1: 'Developer One', dev2: 'Developer Two' },
        openspecDir: 'specs/',
        excludeExtensions: ['.log', '.tmp'],
        activeUserWeeks: 3,
      };

      mockFs({
        '/test-repo': {
          '.openspec-stats.json': JSON.stringify(fullConfig),
        },
      });

      const config = await loadConfig(undefined, '/test-repo');

      expect(config).toEqual(fullConfig);

      mockFs.restore();
    });
  });
});

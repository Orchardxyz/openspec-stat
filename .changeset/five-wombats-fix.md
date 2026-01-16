---
'openspec-stat': minor
---

Fix ES module resolution error and drop Node 18 support.

**Breaking Change:**
- Drop Node 18 support, now requires Node.js >= 20.0.0

**Fixes:**
- Remove `type: module` from package.json to avoid conflicts with CommonJS output
- Update bin entry to use `dist/cjs/cli.js` instead of `dist/esm/cli.js`
- Add `platform: 'node'` config to .fatherrc.ts for better Node.js compatibility
- Fix i18n/index.ts to support both CJS and ESM environments using eval-based __dirname detection
- Update documentation references from dist/esm to dist/cjs
- Remove Node 18 from CI test matrix

This resolves the `ERR_MODULE_NOT_FOUND` error that occurred when running `openspec-stat` command.

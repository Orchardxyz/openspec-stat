---
'openspec-stat': minor
---

Migrate to ESM-only build and fix module resolution errors.

**Breaking Changes:**
- Drop Node 18 support, now requires Node.js >= 20.0.0
- Package is now pure ESM (`"type": "module"` in package.json)
- Remove CommonJS build output, only ESM is distributed

**Fixes:**
- Add `"type": "module"` to package.json for proper ESM support
- Update bin entry to use `dist/esm/cli.js`
- Remove CJS build configuration from .fatherrc.ts
- Add `fix-esm-import-path` package to automatically append `.js` extensions to relative imports during build
- Update tsconfig.json with `moduleResolution: "bundler"` for better ESM compatibility
- Update all build scripts and documentation to reference ESM output

**Technical Details:**
- Uses `father` for TypeScript compilation
- Uses `fix-esm-import-path` post-build step to ensure all relative imports have `.js` extensions for ESM compatibility
- Source code maintains clean TypeScript imports without extensions; extensions are added during build

This resolves the `ERR_REQUIRE_ESM` error when importing chalk 5.x and other pure ESM dependencies.

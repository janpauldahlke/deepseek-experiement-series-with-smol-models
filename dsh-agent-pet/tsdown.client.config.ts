/**
 * Client build for the out-of-tree `dsh-agent-pet` package. Emits `lib/client.js`
 * (CJS, browser) registered through `window.__ModuleLoader__.load({ id, factory })`,
 * mirroring the harness `clientBundle` output contract:
 *
 *  - the platform module table (react, react/jsx-runtime, @deepseek-ai/*) stays
 *    external — the browser module table answers those `require()`s at runtime;
 *  - every other bare specifier (notably `three`) is inlined, because the browser
 *    has no `node_modules`.
 *
 * Run explicitly: `tsdown -c tsdown.client.config.ts`.
 */
import type { UserConfig } from 'tsdown'

const PACKAGE_NAME = 'dsh-agent-pet'

/**
 * Specifiers the browser module table answers at runtime. Everything matching
 * stays external; every other bare specifier (notably `three`) is inlined.
 */
function isPlatformModule(specifier: string): boolean {
  return (
    specifier === 'react'
    || specifier === 'react/jsx-runtime'
    || specifier === 'react-dom'
    || specifier === 'react-dom/client'
    || specifier.startsWith('@deepseek-ai/')
  )
}

const clientConfig: UserConfig = {
  name: 'dsh-agent-pet/client',
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
  jsx: 'react-jsx',
  // `external` is deprecated. Use `deps`:
  //  - neverBundle: the platform module table answers these `require()`s at
  //    runtime (react, react/jsx-runtime, @deepseek-ai/*).
  //  - alwaysBundle: everything else — notably `three` — is inlined, since the
  //    browser has no node_modules.
  deps: {
    neverBundle: isPlatformModule,
    alwaysBundle: (specifier: string) => !isPlatformModule(specifier),
  },
  // Browser bundles inline deps that read process.env / import.meta.env.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'import.meta.env.MODE': JSON.stringify('production'),
    'import.meta.env': JSON.stringify({ MODE: 'production' }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => {`,
    intro: 'var module = { exports: {} }; var exports = module.exports;',
    footer: 'return module.exports; } });',
  },
}

export default clientConfig

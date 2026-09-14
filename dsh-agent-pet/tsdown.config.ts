/**
 * Host build for the out-of-tree `dsh-agent-pet` package: the Cordis Host face,
 * loaded by the CLI's loader from the host-only `--patch` yml. ESM, node target,
 * self-contained (config inlined). Run with `tsdown` (default config).
 *
 * The Client build lives in `tsdown.client.config.ts` (run explicitly with
 * `-c`) because tsdown v0.23 builds one config per invocation here.
 */
import type { UserConfig } from 'tsdown'

const hostConfig: UserConfig = {
  name: 'dsh-agent-pet/host',
  entry: { index: 'src/index.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
}

export default hostConfig

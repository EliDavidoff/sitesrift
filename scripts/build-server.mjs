import { build } from 'esbuild'

await build({
  entryPoints: ['server.ts'],
  outfile: 'dist-server/server.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
})


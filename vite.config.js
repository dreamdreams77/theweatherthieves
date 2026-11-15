import { defineConfig } from 'vite';
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

/** After the build, write dist/sw.js with the full precache list and a content hash, so the installed app works offline
 *  and every new release replaces the old cache. */
function offline() {
  let outDir = 'dist';
  return {
    name: 'weather-thieves-offline', apply: 'build',
    configResolved(c) { outDir = c.build.outDir; },
    closeBundle() {
      const files = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(p); } }; walk(outDir);
      const list = files.map((f) => './' + relative(outDir, f).split('\\').join('/')).filter((f) => f !== './sw.js' && !f.endsWith('.md'));
      const h = createHash('sha256'); for (const f of files.sort()) if (!f.endsWith('sw.js')) h.update(readFileSync(f)); const build = h.digest('hex').slice(0, 12);
      const tpl = readFileSync('src/sw.template.js', 'utf8').replace('__BUILD__', build).replace('__PRECACHE__', JSON.stringify(['./', ...list]));
      writeFileSync(join(outDir, 'sw.js'), tpl);
    },
  };
}
export default defineConfig({ base: './', build: { target: 'es2020', chunkSizeWarningLimit: 1200 }, server: { port: 5173 }, plugins: [offline()] });

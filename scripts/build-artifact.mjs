/**
 * Fold the `--mode artifact` build into one standalone HTML page.
 *
 * Claude Artifacts serve a page from a CSP that admits external scripts from a
 * short CDN allowlist and stylesheets only from Google Fonts, and they wrap the
 * published file in their own document skeleton. So this emits the page body
 * alone — no doctype, <html>, <head> or <body> — with the stylesheet and the JS
 * bundle inlined and the favicon carried as a data URI. The Google Fonts links
 * survive untouched, being the one external stylesheet host that is allowed.
 *
 * Run via `npm run build:artifact`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = 'dist-artifact';
const SOURCE = join(OUT_DIR, 'index.html');
const TARGET = join(OUT_DIR, 'the-reading-room.html');

/** Keep an inlined bundle from closing its own <script> element. */
function escapeForScript(code) {
  return code.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');
}

const html = await readFile(SOURCE, 'utf8');

const title = html.match(/<title>[\s\S]*?<\/title>/i)?.[0] ?? '<title>The Reading Room</title>';
const fontLinks = [...html.matchAll(/<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/gi)]
  .map((match) => match[0])
  .join('\n');

const cssHref = html.match(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/i)?.[1];
const jsSrc = html.match(/<script\b[^>]*src="([^"]+\.js)"[^>]*>/i)?.[1];

if (!cssHref || !jsSrc) {
  throw new Error(`Could not find the built CSS and JS in ${SOURCE}`);
}

const [css, js, favicon] = await Promise.all([
  readFile(join(OUT_DIR, cssHref.replace(/^\.\//, '')), 'utf8'),
  readFile(join(OUT_DIR, jsSrc.replace(/^\.\//, '')), 'utf8'),
  readFile('public/favicon.svg', 'utf8'),
]);

const faviconUri = `data:image/svg+xml,${encodeURIComponent(favicon)}`;

const page = `${title}
<link rel="icon" href="${faviconUri}" type="image/svg+xml" />
${fontLinks}
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
${escapeForScript(js)}
</script>
`;

await writeFile(TARGET, page, 'utf8');

const kb = (value) => `${(value / 1024).toFixed(1)} kB`;
console.log(`${TARGET}  ${kb(Buffer.byteLength(page))}  (css ${kb(css.length)}, js ${kb(js.length)})`);

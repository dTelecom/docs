// Checks every internal link of the built site: the target page exists and so does the #anchor.
// Usage: node scripts/check-links.mjs [dist] [base]
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] || 'dist');
const base = (process.argv[3] || process.env.DOCS_BASE || '/').replace(/\/?$/, '/');

const files = [];
(function walk(dir) {
	for (const name of readdirSync(dir)) {
		const p = path.join(dir, name);
		if (statSync(p).isDirectory()) walk(p);
		else if (name.endsWith('.html')) files.push(p);
	}
})(dist);

const ids = new Map();
const idsOf = (file) => {
	if (!ids.has(file)) {
		const html = readFileSync(file, 'utf8');
		ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
	}
	return ids.get(file);
};

const resolve = (urlPath) => {
	if (!urlPath.startsWith(base)) return null;
	const rel = decodeURI(urlPath.slice(base.length));
	const direct = path.join(dist, rel);
	if (rel === '' || rel.endsWith('/')) return path.join(direct, 'index.html');
	if (existsSync(direct) && statSync(direct).isFile()) return direct;
	return path.join(direct, 'index.html');
};

let checked = 0;
const broken = [];
for (const file of files) {
	const html = readFileSync(file, 'utf8');
	// redirect pages of the old site only carry a meta refresh
	const page = '/' + path.relative(dist, file).split(path.sep).join('/');
	for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
		if (/^(?:[a-z]+:|\/\/)/i.test(href)) continue;
		const [p, anchor] = href.split('#');
		const target = p === '' ? file : resolve(p);
		if (target === null) {
			broken.push(`${page}: ${href} (outside ${base})`);
			continue;
		}
		checked++;
		if (!existsSync(target)) broken.push(`${page}: ${href} (no page)`);
		else if (anchor && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(anchor)))
			broken.push(`${page}: ${href} (no anchor)`);
	}
}

if (broken.length) {
	console.error(`${broken.length} broken links:\n` + [...new Set(broken)].join('\n'));
	process.exit(1);
}
console.log(`${files.length} HTML files, ${checked} internal links, all resolve`);

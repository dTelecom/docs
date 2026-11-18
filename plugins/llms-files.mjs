// After the build, writes the plain-text files for AI coding assistants and robots.txt:
//   llms.txt       - an index of all pages with their descriptions
//   llms-full.txt  - every page in one file
//   <page>.md      - the Markdown source of each page next to its HTML route
// The logic follows the writer's _site-builder/build_site.py.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const intro =
	'> Real-time rooms (WebRTC) and speech AI behind one API key: Speech-to-Text, Text-to-Speech, translation, vision and moderation. Server SDK: @dtelecom/server-sdk-js 4.x (CloudClient). Client SDK: @dtelecom/livekit-client.';

// The home page cards and SDK links are raw HTML: give assistants plain Markdown instead.
export function plainMarkdown(body) {
	return body
		.replace(
			/<a class="card" href="([^"]+)">[\s\S]*?<strong>([\s\S]*?)<\/strong><span class="card-text">([\s\S]*?)<\/span>(?:<span class="price">([\s\S]*?)<\/span>)?<\/a>/g,
			(_, href, title, text, price) => `- [${title}](${href}): ${text}` + (price ? ` ${price}.` : ''),
		)
		.replace(/<span class="sdk-group">(.*?)<\/span>/g, (_, g) => `**${g}**`)
		.replace(/<a href="([^"]+)"><span class="ic"[^>]*><\/span>(.*?)<\/a>/g, (_, href, label) => `- [${label}](${href})`)
		.replace(/<\/?div[^>]*>\n?/g, '');
}

export default function llmsFiles({ contentDir, site, base, noindex }) {
	return {
		name: 'dtelecom-llms-files',
		hooks: {
			'astro:build:done': ({ dir, logger }) => {
				const out = fileURLToPath(dir);
				const nav = JSON.parse(readFileSync(path.join(contentDir, 'navigation.json'), 'utf8'));
				const index = ['# dTelecom Cloud', '', intro, ''];
				const full = ['# dTelecom Cloud documentation', ''];
				let count = 0;

				for (const g of nav.navigation) {
					index.push('## ' + g.group, '');
					for (const page of g.pages) {
						const raw = readFileSync(path.join(contentDir, page + '.md'), 'utf8');
						const meta = Object.fromEntries([...raw.matchAll(/^(title|description): (.+)$/gm)].map((m) => [m[1], m[2]]));
						const body = plainMarkdown(raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim());
						index.push(`- [${meta.title}](${page}.md): ${meta.description}`);
						full.push(`<!-- page: ${page}.md -->`, body, '', '---', '');

						const target = path.join(out, page + '.md');
						mkdirSync(path.dirname(target), { recursive: true });
						writeFileSync(target, page === 'index' ? plainMarkdown(raw) : raw);
						count++;
					}
					index.push('');
				}
				writeFileSync(path.join(out, 'llms.txt'), index.join('\n'));
				writeFileSync(path.join(out, 'llms-full.txt'), full.join('\n'));

				const root = new URL(base.endsWith('/') ? base : base + '/', site).href;
				writeFileSync(
					path.join(out, 'robots.txt'),
					noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${root}sitemap-index.xml\n`,
				);
				logger.info(`llms.txt, llms-full.txt, robots.txt and ${count} Markdown pages written`);
			},
		},
	};
}

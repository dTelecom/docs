// Adapts the writer's Markdown to the site, without changing the source files:
//  - relative links to other pages (`../rooms/tokens.md#anchor`) become site routes;
//    this also covers the raw HTML cards on the home page;
//  - the leading H1 is dropped, the title is rendered from front matter;
//  - a paragraph holding only an SVG image becomes an inlined diagram with a caption,
//    so the diagram follows the site theme through its CSS variables.
// A link to a page that does not exist fails the build.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const external = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i;

export default function remarkDocs({ base, contentDir }) {
	const root = base.endsWith('/') ? base : base + '/';

	return (tree, file) => {
		const source = file.path || file.history?.[0];
		if (!source) return;
		const dir = path.dirname(source);

		const route = (href) => {
			if (external.test(href)) return href;
			const [target, anchor] = href.split('#');
			if (!target.endsWith('.md')) return href;
			const abs = path.resolve(dir, target);
			if (!existsSync(abs)) throw new Error(`${path.relative(contentDir, source)}: broken link ${href}`);
			const page = path.relative(contentDir, abs).replace(/\.md$/, '').split(path.sep).join('/');
			const url = page === 'index' ? root : `${root}${page.replace(/\/index$/, '')}/`;
			return anchor ? `${url}#${anchor}` : url;
		};

		const walk = (node, parent, index) => {
			if (node.type === 'link') node.url = route(node.url);
			if (node.type === 'html') {
				node.value = node.value.replace(/href="([^"]+)"/g, (_, href) => `href="${route(href)}"`);
			}
			if (
				node.type === 'paragraph' &&
				node.children.length === 1 &&
				node.children[0].type === 'image' &&
				node.children[0].url.endsWith('.svg') &&
				!external.test(node.children[0].url)
			) {
				const img = node.children[0];
				const svg = readFileSync(path.resolve(dir, img.url), 'utf8').replace(/<\?xml[^>]*>\s*/, '');
				const caption = escape(img.alt || '');
				parent.children[index] = {
					type: 'html',
					value: `<figure class="diagram">${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`,
				};
				return;
			}
			node.children?.forEach((child, i) => walk(child, node, i));
		};
		walk(tree, null, 0);

		// Tables go in a scrolling frame, so header, rows and borders always span the full width.
		const frameTables = (node) => {
			if (!node.children) return;
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (child.type === 'table') {
					node.children.splice(
						i,
						1,
						{ type: 'html', value: '<div class="table-frame">' },
						child,
						{ type: 'html', value: '</div>' },
					);
					i += 2;
				} else frameTables(child);
			}
		};
		frameTables(tree);

		// The title comes from front matter and is rendered by PageTitle: drop the duplicate H1.
		const first = tree.children.findIndex((n) => n.type !== 'yaml');
		if (first >= 0 && tree.children[first].type === 'heading' && tree.children[first].depth === 1) {
			tree.children.splice(first, 1);
		}
	};
}

function escape(s) {
	return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

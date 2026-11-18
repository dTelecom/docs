import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { unified } from '@astrojs/markdown-remark';
import remarkDocs from './plugins/remark-docs.mjs';
import llmsFiles from './plugins/llms-files.mjs';

// Production: https://docs.dtelecom.org at /. The GitHub Pages test build sets
// DOCS_SITE=https://dtelecom.github.io DOCS_BASE=/docs DOCS_NOINDEX=1.
const site = process.env.DOCS_SITE || 'https://docs.dtelecom.org';
const base = process.env.DOCS_BASE || '/';
const noindex = process.env.DOCS_NOINDEX === '1';

const contentDir = new URL('./src/content/docs/', import.meta.url);
const nav = JSON.parse(readFileSync(new URL('navigation.json', contentDir), 'utf8'));

// The sidebar is the writer's navigation.json; "index" is the home page.
const sidebar = nav.navigation.map((g) => ({
	label: g.group,
	items: g.pages.map((p) => (p === 'index' ? '' : p)),
}));

// Pages of the previous docs site and where they live now.
const redirects = {
	'/guides/getting-started': '/quickstart/',
	'/guides/architecture': '/concepts/how-it-works/',
	'/guides/ai-services': '/ai/overview/',
	'/guides/access-tokens': '/rooms/tokens/',
	'/guides/server-api': '/reference/server-sdk/',
	'/guides/webhooks': '/rooms/webhooks/',
	'/guides/room/connect': '/rooms/connect/',
	'/guides/room/publish': '/rooms/connect/',
	'/guides/room/receive': '/rooms/connect/',
	'/guides/room/data': '/rooms/data/',
	'/guides/conference-app': '/guides/video-conference-react/',
	'/references/client-sdks': '/reference/sdks/',
	'/references/server-sdks': '/reference/server-sdk/',
	'/llm-resources': '/reference/llm-resources/',
};
const withBase = (p) => (base.replace(/\/$/, '') + p).replace(/^$/, '/');
const ogImage = new URL(withBase('/og.png'), site).href;

export default defineConfig({
	site,
	base,
	trailingSlash: 'ignore',
	redirects: Object.fromEntries(Object.entries(redirects).map(([from, to]) => [from, withBase(to)])),
	markdown: {
		processor: unified({ remarkPlugins: [[remarkDocs, { base, contentDir: contentDir.pathname }]] }),
	},
	integrations: [
		starlight({
			title: 'dTelecom Cloud Docs',
			description: 'Real-time voice, video and speech AI behind one API key and one bill.',
			favicon: '/favicon.png',
			head: [
				{ tag: 'link', attrs: { rel: 'icon', href: withBase('/favicon.ico'), sizes: '32x32' } },
				// link previews (Slack, X, LinkedIn): public/og.png, 1200x630
				{ tag: 'meta', attrs: { property: 'og:image', content: ogImage } },
				{ tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
				{ tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
				{ tag: 'meta', attrs: { property: 'og:image:alt', content: 'dTelecom Cloud developer docs' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: ogImage } },
				...(noindex ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' } }] : []),
			],
			sidebar,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			pagination: true,
			lastUpdated: false,
			customCss: [
				'@fontsource/onest/400.css',
				'@fontsource/onest/500.css',
				'@fontsource/onest/600.css',
				'@fontsource/onest/700.css',
				'@fontsource/jetbrains-mono/400.css',
				'@fontsource/jetbrains-mono/500.css',
				'./src/styles/theme.css',
				'./src/styles/home.css',
			],
			components: {
				Header: './src/components/Header.astro',
				PageTitle: './src/components/PageTitle.astro',
			},
			expressiveCode: {
				// Code blocks are dark in both site themes, as in the prototype.
				themes: ['github-dark-default'],
				useStarlightDarkModeSwitch: false,
				useStarlightUiThemeColors: false,
				// plain boxes with a copy button, no editor or terminal chrome
				defaultProps: { frame: 'none' },
				styleOverrides: {
					borderRadius: '10px',
					borderColor: 'var(--line)',
					codeBackground: 'var(--code-bg)',
					codeFontFamily: 'var(--font-mono)',
					codeFontSize: '13.5px',
					codeLineHeight: '1.6',
					uiFontFamily: 'var(--font-body)',
					frames: {
						shadowColor: 'transparent',
						editorBackground: 'var(--code-bg)',
						terminalBackground: 'var(--code-bg)',
						editorTabBarBackground: 'var(--code-bg)',
						terminalTitlebarBackground: 'var(--code-bg)',
					},
				},
			},
		}),
		llmsFiles({ contentDir: contentDir.pathname, site, base, noindex }),
	],
});

const repoUrl = 'https://github.com/dTelecom'

module.exports = {
  title: 'Docs',
  tagline: 'dTelecom Documentation',
  url: 'https://docs.dtelecom.org/',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },
  favicon: 'img/favicon.png',
  organizationName: 'dTelecom',
  projectName: 'docs',
  themeConfig: {
    navbar: {
      title: 'Docs',
      logo: {
        alt: 'dTelecom Logo',
        src: 'img/favicon.png',
      },
      items: [
        {
          href: 'https://video.dtelecom.org',
          label: 'Home',
          position: 'right',
        },
        {
          href: repoUrl,
          label: 'GitHub',
          position: 'right',
          className: 'github',
        },
      ],
    },
    footer: {
      style: 'light',
      links: [
      ],
      copyright: `Copyright © ${new Date().getFullYear()} dTelecom`,
    },
    colorMode: {
      respectPrefersColorScheme: false,
      defaultMode: 'light',
      disableSwitch: true,
    },
    prism: {
      theme: require('./themes/dtelecom'),
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
      },
    ],
  ]
};

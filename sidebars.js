module.exports = {
  sidebar: [
    {
      type: 'doc',
      id: 'index',
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/getting-started',
        'guides/0a-architecture',
        'guides/access-tokens',
        'guides/server-api',
        'guides/webhooks',
        {
          type: 'category',
          label: 'Working with Rooms',
          collapsed: true,
          items: [
            'guides/room/connect',
            'guides/room/publish',
            'guides/room/receive',
            'guides/room/data',
          ],
        },
        'guides/conference-app',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
       'references/client-sdks',
       'references/server-sdks',
      ]
    },
    {
      type: 'category',
      label: 'LLM Resources',
      collapsed: true,
      items: [
        'llm-resources/index',
      ]
    }
  ],
};

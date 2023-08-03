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
    }
  ],
};

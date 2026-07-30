export const adminNavigationSections = [
  {
    title: 'Admin',
    items: [
      { label: 'Documents', view: 'documents', icon: 'D' },
      { label: 'Website Importer', view: 'websiteImport', icon: 'I' },
      {
        label: 'Embed Generator',
        icon: 'E',
        children: [
          { label: 'Chatbot Generator', view: 'embedGenerator', icon: 'C' },
          { label: 'Website Access', view: 'websiteAccess', icon: 'W' },
          { label: 'Scope Management', view: 'scopeManagement', icon: 'S' },
        ],
        menuKey: 'embed',
      },
      { label: 'Chat History', view: 'chatLogs', icon: 'C' },
      { label: 'User Records', view: 'users', icon: 'U' },
    ],
  },
]



export const singletonTypes = new Set(['profile', 'about', 'contact', 'siteSettings']);

function singletonItem(S, title, schemaType, documentId) {
  return S.listItem()
    .title(title)
    .id(documentId)
    .child(S.document().schemaType(schemaType).documentId(documentId));
}

function orderedList(S, title, schemaType, secondaryField = '_createdAt') {
  return S.listItem()
    .title(title)
    .schemaType(schemaType)
    .child(
      S.documentTypeList(schemaType)
        .title(title)
        .defaultOrdering([
          { field: 'order', direction: 'asc' },
          ...(secondaryField === '_createdAt'
            ? []
            : [{ field: secondaryField, direction: 'desc' }]),
          { field: '_createdAt', direction: 'asc' },
        ]),
    );
}

export const structure = (S) =>
  S.list()
    .title('Portfolio content')
    .items([
      singletonItem(S, 'Profile and hero', 'profile', 'profile'),
      singletonItem(S, 'About', 'about', 'about'),
      S.divider(),
      orderedList(S, 'Education', 'education', 'startYear'),
      orderedList(S, 'Projects', 'project'),
      S.divider(),
      orderedList(S, 'Skill categories', 'skillCategory'),
      orderedList(S, 'Skills', 'skill'),
      S.divider(),
      singletonItem(S, 'Contact and social links', 'contact', 'contact'),
      singletonItem(S, 'Site settings and SEO', 'siteSettings', 'siteSettings'),
    ]);

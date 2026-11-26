export const singletonTypes = new Set([
  'profile',
  'about',
  'skillsPresentation',
  'projectsSettings',
  'contact',
  'siteSettings',
]);

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
      orderedList(S, 'Creative work', 'creativeWork'),
      singletonItem(S, 'Projects presentation', 'projectsSettings', 'projectsSettings'),
      S.divider(),
      singletonItem(S, 'Skills presentation', 'skillsPresentation', 'skillsPresentation'),
      orderedList(S, 'Skill categories', 'skillCategory'),
      S.listItem()
        .title('Skills Library')
        .schemaType('skill')
        .child(
          S.list()
            .title('Skills Library')
            .items([
              orderedList(S, 'All skills', 'skill').getChild(),
              S.listItem()
                .title('Visible skills')
                .child(
                  S.documentList()
                    .title('Visible skills')
                    .filter('_type == "skill" && visible == true')
                    .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                ),
              S.listItem()
                .title('Hidden skills')
                .child(
                  S.documentList()
                    .title('Hidden skills')
                    .filter('_type == "skill" && visible != true')
                    .defaultOrdering([{ field: 'name', direction: 'asc' }]),
                ),
              ...['Working With', 'Learning'].map((status) =>
                S.listItem()
                  .title(status)
                  .child(
                    S.documentList()
                      .title(status)
                      .filter('_type == "skill" && status == $status')
                      .params({ status })
                      .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                  ),
              ),
              S.divider(),
              S.listItem()
                .title('Browse by category')
                .child(
                  S.documentTypeList('skillCategory')
                    .title('Skill categories')
                    .child((categoryId) =>
                      S.documentList()
                        .title('Skills in category')
                        .filter('_type == "skill" && references($categoryId)')
                        .params({ categoryId })
                        .defaultOrdering([{ field: 'order', direction: 'asc' }]),
                    ),
                ),
            ]),
        ),
      S.divider(),
      singletonItem(S, 'Contact and social links', 'contact', 'contact'),
      singletonItem(S, 'Site settings and SEO', 'siteSettings', 'siteSettings'),
    ]);

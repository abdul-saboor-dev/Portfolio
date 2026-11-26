import { defineField, defineType } from 'sanity';

export const projectsSettings = defineType({
  name: 'projectsSettings',
  title: 'Projects presentation',
  type: 'document',
  fields: [
    ...[
      ['buildDescription', 'Build description', 180],
      ['designDescription', 'Design description', 180],
      ['creativeIntroduction', 'Creative introduction', 180],
      ['closingTitle', 'Closing title', 80],
      ['closingDescription', 'Closing description', 180],
    ].map(([name, title, max]) =>
      defineField({
        name,
        title,
        type: 'string',
        validation: (rule) => rule.required().max(max),
      }),
    ),
  ],
  preview: { prepare: () => ({ title: 'Projects presentation' }) },
});

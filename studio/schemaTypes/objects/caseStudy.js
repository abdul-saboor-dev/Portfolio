import { defineField, defineType } from 'sanity';

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Detailed case study',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'overview',
      title: 'Overview',
      type: 'blockContent',
    }),
    defineField({
      name: 'challenge',
      title: 'Challenge',
      type: 'blockContent',
    }),
    defineField({
      name: 'approach',
      title: 'Approach',
      type: 'blockContent',
    }),
    defineField({
      name: 'outcome',
      title: 'Outcome',
      type: 'blockContent',
      description:
        'Use only verified outcomes. Do not add unsupported claims or metrics.',
    }),
  ],
});

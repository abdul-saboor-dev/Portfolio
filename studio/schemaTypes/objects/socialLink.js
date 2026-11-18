import { defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().max(30),
    }),
    defineField({
      name: 'url',
      title: 'URL',
      type: 'url',
      validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
    }),
    orderField,
  ],
  preview: {
    select: { title: 'label', subtitle: 'url' },
  },
});

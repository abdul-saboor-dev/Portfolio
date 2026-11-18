import { defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

export const skillCategory = defineType({
  name: 'skillCategory',
  title: 'Skill category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(200),
    }),
    orderField,
  ],
  preview: {
    select: { title: 'title', order: 'order' },
    prepare: ({ title, order }) => ({
      title: title || 'Untitled category',
      subtitle: `Order ${order ?? 0}`,
    }),
  },
});

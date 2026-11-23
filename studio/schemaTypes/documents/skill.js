import { defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

const statuses = ['Working With', 'Learning'];

export const skill = defineType({
  name: 'skill',
  title: 'Skill',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'skillCategory' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aliases',
      title: 'Search aliases and keywords',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: false },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required().max(120),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'alternateLogo',
      title: 'Optional fallback logo',
      type: 'image',
      description: 'Used only when the primary asset cannot be displayed.',
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      initialValue: 'Working With',
      options: {
        list: statuses.map((title) => ({ title, value: title })),
        layout: 'radio',
      },
      validation: (rule) =>
        rule
          .required()
          .custom((value) => statuses.includes(value) || 'Choose a supported status.'),
    }),
    defineField({
      name: 'visible',
      title: 'Show on portfolio',
      type: 'boolean',
      initialValue: false,
      description:
        'Hidden records stay in the Skills Library without appearing publicly.',
    }),
    orderField,
  ],
  preview: {
    select: {
      title: 'name',
      category: 'category.title',
      status: 'status',
      visible: 'visible',
      order: 'order',
      media: 'logo',
    },
    prepare: ({ title, category, status, visible, order, media }) => ({
      title: title || 'Untitled skill',
      media,
      subtitle: `${category || 'Uncategorized'} · ${status || 'No status'} · ${visible ? 'Visible' : 'Hidden'} · Order ${order ?? 0}`,
    }),
  },
});

import { defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

export const creativeWork = defineType({
  name: 'creativeWork',
  title: 'Creative work',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(500),
    }),
    defineField({ name: 'extendedDescription', type: 'text', rows: 6 }),
    defineField({
      name: 'artwork',
      type: 'image',
      validation: (rule) => rule.required(),
    }),
    defineField({ name: 'fullSize', title: 'Full-size artwork', type: 'image' }),
    defineField({ name: 'additionalArtworks', type: 'array', of: [{ type: 'image' }] }),
    defineField({ name: 'video', type: 'file' }),
    defineField({
      name: 'tools',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({ name: 'series', type: 'string' }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      validation: (rule) => rule.required().max(160),
    }),
    defineField({
      name: 'externalUrl',
      title: 'External link',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'visible',
      title: 'Show on portfolio',
      type: 'boolean',
      initialValue: false,
    }),
    orderField,
  ],
  orderings: [
    {
      title: 'Portfolio order',
      name: 'portfolioOrder',
      by: [{ field: 'order', direction: 'asc' }],
    },
  ],
  preview: { select: { title: 'title', subtitle: 'category', media: 'artwork' } },
});

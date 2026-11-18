import { defineArrayMember, defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    orderField,
    defineField({
      name: 'featured',
      title: 'Featured project',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
      validation: (rule) => rule.required(),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          validation: (rule) => rule.required().max(160),
        }),
      ],
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(280),
    }),
    defineField({
      name: 'description',
      title: 'Full description',
      type: 'blockContent',
    }),
    defineField({
      name: 'technologies',
      title: 'Technologies',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
      validation: (rule) => rule.required().min(1).max(20).unique(),
    }),
    defineField({
      name: 'githubUrl',
      title: 'GitHub URL',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'liveUrl',
      title: 'Live project URL',
      type: 'url',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'media',
      title: 'Project media',
      type: 'array',
      of: [defineArrayMember({ type: 'projectMedia' })],
      validation: (rule) => rule.max(20),
    }),
    defineField({
      name: 'caseStudy',
      title: 'Detailed case study',
      type: 'caseStudy',
    }),
    defineField({
      name: 'seo',
      title: 'Project SEO',
      type: 'seo',
    }),
  ],
  orderings: [
    {
      title: 'Portfolio order',
      name: 'portfolioOrder',
      by: [
        { field: 'order', direction: 'asc' },
        { field: '_createdAt', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      media: 'coverImage',
      featured: 'featured',
      order: 'order',
    },
    prepare: ({ title, media, featured, order }) => ({
      title: title || 'Untitled project',
      subtitle: `${featured ? 'Featured · ' : ''}Order ${order ?? 0}`,
      media,
    }),
  },
});

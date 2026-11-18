import { defineField, defineType } from 'sanity';

export const projectMedia = defineType({
  name: 'projectMedia',
  title: 'Project media',
  type: 'object',
  fields: [
    defineField({
      name: 'kind',
      title: 'Media type',
      type: 'string',
      initialValue: 'image',
      options: {
        layout: 'radio',
        list: [
          { title: 'Image', value: 'image' },
          { title: 'External video', value: 'externalVideo' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
      hidden: ({ parent }) => parent?.kind === 'externalVideo',
      validation: (rule) =>
        rule.custom((value, context) =>
          context.parent?.kind === 'image' && !value ? 'An image is required.' : true,
        ),
    }),
    defineField({
      name: 'externalVideoUrl',
      title: 'External video URL',
      type: 'url',
      hidden: ({ parent }) => parent?.kind !== 'externalVideo',
      validation: (rule) =>
        rule
          .uri({ scheme: ['http', 'https'] })
          .custom((value, context) =>
            context.parent?.kind === 'externalVideo' && !value
              ? 'A video URL is required.'
              : true,
          ),
    }),
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description: 'Required for images; describe the useful visual information.',
      hidden: ({ parent }) => parent?.kind === 'externalVideo',
      validation: (rule) =>
        rule
          .max(160)
          .custom((value, context) =>
            context.parent?.kind === 'image' && !value?.trim()
              ? 'Alternative text is required.'
              : true,
          ),
    }),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: { title: 'caption', subtitle: 'kind', media: 'image' },
    prepare: ({ title, subtitle, media }) => ({
      title: title || 'Untitled media',
      subtitle,
      media,
    }),
  },
});

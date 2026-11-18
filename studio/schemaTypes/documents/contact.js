import { defineArrayMember, defineField, defineType } from 'sanity';

export const contact = defineType({
  name: 'contact',
  title: 'Contact and social links',
  type: 'document',
  fields: [
    defineField({
      name: 'email',
      title: 'Public email address',
      type: 'string',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'availability',
      title: 'Availability statement',
      type: 'string',
      description: 'Optional. Use only an accurate, current statement.',
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [defineArrayMember({ type: 'socialLink' })],
      validation: (rule) => rule.max(12),
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Contact and social links' }),
  },
});

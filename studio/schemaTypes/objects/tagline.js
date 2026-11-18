import {
  IDENTITY_TAGLINE_MAX_LENGTH,
  IDENTITY_TAGLINE_MIN_LENGTH,
} from '@portfolio/content-model';
import { defineField, defineType } from 'sanity';

export const tagline = defineType({
  name: 'tagline',
  title: 'Professional identity tagline',
  type: 'object',
  fields: [
    defineField({
      name: 'text',
      title: 'Text',
      type: 'string',
      description: `Keep this on one line (${IDENTITY_TAGLINE_MIN_LENGTH}–${IDENTITY_TAGLINE_MAX_LENGTH} characters).`,
      validation: (rule) =>
        rule
          .required()
          .min(IDENTITY_TAGLINE_MIN_LENGTH)
          .max(IDENTITY_TAGLINE_MAX_LENGTH)
          .regex(/^[^\r\n]+$/, { name: 'single line' }),
    }),
  ],
  preview: {
    select: { title: 'text' },
  },
});

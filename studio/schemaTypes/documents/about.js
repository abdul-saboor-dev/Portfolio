import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  APPROVED_ABOUT_NARRATIVE,
} from '@portfolio/content-model';
import { defineField, defineType } from 'sanity';

export const about = defineType({
  name: 'about',
  title: 'About',
  type: 'document',
  fields: [
    defineField({
      name: 'narrative',
      title: 'About narrative',
      type: 'text',
      rows: 12,
      description: `One continuous paragraph. Maximum ${ABOUT_NARRATIVE_MAX_LENGTH} characters.`,
      initialValue: APPROVED_ABOUT_NARRATIVE,
      validation: (rule) => rule.required().min(1).max(ABOUT_NARRATIVE_MAX_LENGTH),
    }),
  ],
  preview: {
    select: { narrative: 'narrative' },
    prepare: ({ narrative }) => ({
      title: 'About',
      subtitle: narrative
        ? `${narrative.slice(0, 80)}${narrative.length > 80 ? '…' : ''}`
        : '',
    }),
  },
});

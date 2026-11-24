import {
  APPROVED_SKILLS_DESCRIPTION,
  APPROVED_SKILLS_HEADING,
  SKILLS_DESCRIPTION_MAX_LENGTH,
  SKILLS_HEADING_MAX_LENGTH,
} from '@portfolio/content-model';
import { defineField, defineType } from 'sanity';

export const skillsPresentation = defineType({
  name: 'skillsPresentation',
  title: 'Skills presentation',
  type: 'document',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: `Editorial Skills heading. Maximum ${SKILLS_HEADING_MAX_LENGTH} characters.`,
      initialValue: APPROVED_SKILLS_HEADING,
      validation: (rule) => rule.required().min(1).max(SKILLS_HEADING_MAX_LENGTH),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: `Short Skills introduction. Maximum ${SKILLS_DESCRIPTION_MAX_LENGTH} characters.`,
      initialValue: APPROVED_SKILLS_DESCRIPTION,
      validation: (rule) => rule.required().min(1).max(SKILLS_DESCRIPTION_MAX_LENGTH),
    }),
  ],
  preview: {
    select: { description: 'description', heading: 'heading' },
    prepare: ({ description, heading }) => ({
      title: heading || 'Skills presentation',
      subtitle: description || '',
    }),
  },
});

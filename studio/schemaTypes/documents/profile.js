import {
  APPROVED_HERO_INTRODUCTION,
  APPROVED_HERO_STATEMENTS,
  CV_ACTION_LABEL_MAX_LENGTH,
  HERO_INTRODUCTION_MAX_LENGTH,
  HERO_STATEMENT_COUNT,
  HERO_STATEMENT_MAX_LENGTH,
  IDENTITY_TAGLINE_COUNT,
  PROJECTS_ACTION_LABEL_MAX_LENGTH,
  validateIdentityTaglines,
} from '@portfolio/content-model';
import { defineArrayMember, defineField, defineType } from 'sanity';

export const profile = defineType({
  name: 'profile',
  title: 'Profile and hero',
  type: 'document',
  fields: [
    defineField({
      name: 'fullName',
      title: 'Full name',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'string',
      description: 'Optional. Leave empty until final copy is approved.',
      validation: (rule) => rule.max(100),
    }),
    defineField({
      name: 'heroStatements',
      title: 'Hero editorial statements',
      type: 'array',
      description: `Exactly ${HERO_STATEMENT_COUNT} statements. Each statement must be ${HERO_STATEMENT_MAX_LENGTH} characters or fewer.`,
      initialValue: [...APPROVED_HERO_STATEMENTS],
      of: [
        defineArrayMember({
          type: 'string',
          validation: (rule) => rule.required().min(1).max(HERO_STATEMENT_MAX_LENGTH),
        }),
      ],
      validation: (rule) => rule.required().length(HERO_STATEMENT_COUNT),
    }),
    defineField({
      name: 'heroIntroduction',
      title: 'Hero introduction',
      type: 'text',
      rows: 4,
      description: `Required. Maximum ${HERO_INTRODUCTION_MAX_LENGTH} characters.`,
      initialValue: APPROVED_HERO_INTRODUCTION,
      validation: (rule) => rule.required().min(1).max(HERO_INTRODUCTION_MAX_LENGTH),
    }),
    defineField({
      name: 'projectsAction',
      title: 'Explore Projects action',
      type: 'object',
      description:
        'Configure a real internal section ID or a safe external HTTP(S) destination.',
      initialValue: {
        label: 'Explore Projects',
        destinationType: 'internal',
        destinationValue: 'projects',
      },
      fields: [
        defineField({
          name: 'label',
          title: 'Display label',
          type: 'string',
          description: `Maximum ${PROJECTS_ACTION_LABEL_MAX_LENGTH} characters.`,
          validation: (rule) =>
            rule.required().min(1).max(PROJECTS_ACTION_LABEL_MAX_LENGTH),
        }),
        defineField({
          name: 'destinationType',
          title: 'Destination type',
          type: 'string',
          options: {
            layout: 'radio',
            list: [
              { title: 'Internal section', value: 'internal' },
              { title: 'External URL', value: 'external' },
            ],
          },
          validation: (rule) => rule.required(),
        }),
        defineField({
          name: 'destinationValue',
          title: 'Destination value',
          type: 'string',
          description:
            'For internal destinations, enter a section ID such as projects. For external destinations, enter a complete HTTPS URL.',
          validation: (rule) =>
            rule.required().custom((value, context) => {
              const destinationType = context.parent?.destinationType;
              if (destinationType === 'internal') {
                return (
                  /^[a-z][a-z0-9-]*$/.test(value || '') ||
                  'Enter a valid section ID using lowercase letters, numbers, and hyphens.'
                );
              }
              if (destinationType === 'external') {
                try {
                  const url = new URL(value);
                  return (
                    ['http:', 'https:'].includes(url.protocol) ||
                    'External destinations must use HTTP or HTTPS.'
                  );
                } catch {
                  return 'Enter a complete, valid external URL.';
                }
              }
              return 'Choose a destination type.';
            }),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'cvActionLabel',
      title: 'View CV action label',
      type: 'string',
      description: `Maximum ${CV_ACTION_LABEL_MAX_LENGTH} characters.`,
      initialValue: 'View CV',
      validation: (rule) => rule.required().min(1).max(CV_ACTION_LABEL_MAX_LENGTH),
    }),
    defineField({
      name: 'taglines',
      title: 'Professional identity taglines',
      type: 'array',
      description: `Exactly ${IDENTITY_TAGLINE_COUNT} unique taglines are required. Drag items to change their order.`,
      of: [defineArrayMember({ type: 'tagline' })],
      validation: (rule) =>
        rule
          .required()
          .length(IDENTITY_TAGLINE_COUNT)
          .custom((items) => {
            const result = validateIdentityTaglines(
              items?.map((item) => item?.text) ?? [],
            );
            return result.valid || result.errors[0];
          }),
    }),
    defineField({
      name: 'portrait',
      title: 'Primary portrait',
      type: 'image',
      options: { hotspot: true },
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
      name: 'cvTitle',
      title: 'CV document title',
      type: 'string',
      description: 'Used as the accessible title in the portfolio CV viewer.',
      initialValue: 'Abdul Saboor | Curriculum Vitae',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'cvFile',
      title: 'CV PDF',
      type: 'file',
      description:
        'Optional. The View CV action remains unavailable until a published PDF is configured.',
      options: { accept: 'application/pdf' },
      validation: (rule) =>
        rule.custom((value) => {
          const isPdf = value?.asset?._ref?.endsWith('-pdf');
          return !value || isPdf || 'Upload a PDF document.';
        }),
    }),
  ],
  preview: {
    select: { title: 'fullName', media: 'portrait' },
    prepare: ({ title, media }) => ({ title: title || 'Profile and hero', media }),
  },
});

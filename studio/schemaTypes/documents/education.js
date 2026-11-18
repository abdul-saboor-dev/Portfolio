import {
  EDUCATION_ACADEMIC_YEAR_MAX_LENGTH,
  EDUCATION_DESCRIPTION_MAX_LENGTH,
  EDUCATION_INSTITUTION_MAX_LENGTH,
  EDUCATION_QUALIFICATION_MAX_LENGTH,
  EDUCATION_STAGE_MAX_LENGTH,
  EDUCATION_STATUSES,
  EDUCATION_YEAR_MAX,
  EDUCATION_YEAR_MIN,
} from '@portfolio/content-model';
import { defineField, defineType } from 'sanity';
import { orderField } from '../fields.js';

export const education = defineType({
  name: 'education',
  title: 'Education',
  type: 'document',
  fields: [
    defineField({
      name: 'institution',
      title: 'Institution',
      type: 'string',
      description: `Required. Maximum ${EDUCATION_INSTITUTION_MAX_LENGTH} characters.`,
      validation: (rule) => rule.required().min(1).max(EDUCATION_INSTITUTION_MAX_LENGTH),
    }),
    defineField({
      name: 'qualification',
      title: 'Qualification or program',
      type: 'string',
      description: `Required. Maximum ${EDUCATION_QUALIFICATION_MAX_LENGTH} characters.`,
      validation: (rule) =>
        rule.required().min(1).max(EDUCATION_QUALIFICATION_MAX_LENGTH),
    }),
    defineField({
      name: 'startYear',
      title: 'Start year',
      type: 'number',
      validation: (rule) =>
        rule.required().integer().min(EDUCATION_YEAR_MIN).max(EDUCATION_YEAR_MAX),
    }),
    defineField({
      name: 'endYear',
      title: 'End or expected end year',
      type: 'number',
      validation: (rule) =>
        rule
          .required()
          .integer()
          .min(EDUCATION_YEAR_MIN)
          .max(EDUCATION_YEAR_MAX)
          .custom((endYear, context) => {
            const startYear = context.document?.startYear;
            return !endYear || !startYear || endYear >= startYear
              ? true
              : 'End year must not be before the start year.';
          }),
    }),
    defineField({
      name: 'educationStage',
      title: 'Education stage',
      type: 'string',
      description: `Optional. Maximum ${EDUCATION_STAGE_MAX_LENGTH} characters.`,
      validation: (rule) => rule.max(EDUCATION_STAGE_MAX_LENGTH),
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        layout: 'radio',
        list: EDUCATION_STATUSES.map((status) => ({ title: status, value: status })),
      },
      validation: (rule) =>
        rule.required().custom((value) => {
          return EDUCATION_STATUSES.includes(value) || 'Choose a supported status.';
        }),
    }),
    defineField({
      name: 'academicYearLabel',
      title: 'Academic year label',
      type: 'string',
      description: `Optional, for labels such as Final Year. Maximum ${EDUCATION_ACADEMIC_YEAR_MAX_LENGTH} characters.`,
      validation: (rule) => rule.max(EDUCATION_ACADEMIC_YEAR_MAX_LENGTH),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
      description: `Required factual context. Maximum ${EDUCATION_DESCRIPTION_MAX_LENGTH} characters.`,
      validation: (rule) => rule.required().min(1).max(EDUCATION_DESCRIPTION_MAX_LENGTH),
    }),
    orderField,
  ],
  orderings: [
    {
      title: 'Portfolio order',
      name: 'portfolioOrder',
      by: [
        { field: 'order', direction: 'asc' },
        { field: 'startYear', direction: 'desc' },
        { field: '_createdAt', direction: 'asc' },
      ],
    },
    {
      title: 'Most recent start year',
      name: 'recentFirst',
      by: [
        { field: 'startYear', direction: 'desc' },
        { field: 'order', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'qualification',
      institution: 'institution',
      startYear: 'startYear',
      endYear: 'endYear',
      status: 'status',
    },
    prepare: ({ title, institution, startYear, endYear, status }) => ({
      title: title || 'Untitled education entry',
      subtitle: [institution, [startYear, endYear].filter(Boolean).join(' to '), status]
        .filter(Boolean)
        .join(' | '),
    }),
  },
});

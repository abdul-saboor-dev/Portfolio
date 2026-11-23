import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  APPROVED_ABOUT_NARRATIVE,
  APPROVED_EDUCATION_RECORDS,
  APPROVED_HERO_INTRODUCTION,
  APPROVED_HERO_STATEMENTS,
  APPROVED_IDENTITY_TAGLINES,
  APPROVED_SKILLS,
  CV_ACTION_LABEL_MAX_LENGTH,
  EDUCATION_ACADEMIC_YEAR_MAX_LENGTH,
  EDUCATION_DESCRIPTION_MAX_LENGTH,
  EDUCATION_INSTITUTION_MAX_LENGTH,
  EDUCATION_QUALIFICATION_MAX_LENGTH,
  EDUCATION_STAGE_MAX_LENGTH,
  EDUCATION_STATUSES,
  EDUCATION_YEAR_MAX,
  EDUCATION_YEAR_MIN,
  HERO_INTRODUCTION_MAX_LENGTH,
  HERO_STATEMENT_COUNT,
  HERO_STATEMENT_MAX_LENGTH,
  IDENTITY_TAGLINE_COUNT,
  IDENTITY_TAGLINE_MAX_LENGTH,
  IDENTITY_TAGLINE_MIN_LENGTH,
  PROJECTS_ACTION_LABEL_MAX_LENGTH,
  SKILL_STATUSES,
} from '@portfolio/content-model';
import { z } from 'zod';

const nullableText = (maximum) => z.string().trim().max(maximum).nullable().optional();
const portableTextSchema = z.array(z.unknown()).default([]);
const imageSchema = z.record(z.string(), z.unknown()).nullable().optional();
const cvSchema = z
  .object({
    url: z.url().refine((value) => /^https?:\/\//i.test(value), {
      message: 'CV URL must use HTTP or HTTPS.',
    }),
    title: z.string().trim().min(1).max(120),
    filename: nullableText(160),
  })
  .nullable()
  .optional();

const taglineSchema = z.object({
  text: z
    .string()
    .trim()
    .min(IDENTITY_TAGLINE_MIN_LENGTH)
    .max(IDENTITY_TAGLINE_MAX_LENGTH)
    .regex(/^[^\r\n]+$/),
});

const heroStatementSchema = z.string().trim().min(1).max(HERO_STATEMENT_MAX_LENGTH);
const safeExternalUrlSchema = z.url().refine((value) => /^https?:\/\//i.test(value), {
  message: 'External destinations must use HTTP or HTTPS.',
});
const internalDestinationSchema = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]*$/, 'Internal destinations must be valid section IDs.');
const projectsActionSchema = z.discriminatedUnion('destinationType', [
  z.object({
    label: z.string().trim().min(1).max(PROJECTS_ACTION_LABEL_MAX_LENGTH),
    destinationType: z.literal('internal'),
    destinationValue: internalDestinationSchema,
  }),
  z.object({
    label: z.string().trim().min(1).max(PROJECTS_ACTION_LABEL_MAX_LENGTH),
    destinationType: z.literal('external'),
    destinationValue: safeExternalUrlSchema,
  }),
]);

const DEFAULT_PROJECTS_ACTION = Object.freeze({
  label: 'Explore Projects',
  destinationType: 'internal',
  destinationValue: 'projects',
});

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(80),
  heroHeadline: nullableText(100),
  heroStatements: z
    .array(heroStatementSchema)
    .length(HERO_STATEMENT_COUNT)
    .nullish()
    .transform((value) => value ?? [...APPROVED_HERO_STATEMENTS]),
  heroIntroduction: z
    .string()
    .trim()
    .min(1)
    .max(HERO_INTRODUCTION_MAX_LENGTH)
    .nullish()
    .transform((value) => value ?? APPROVED_HERO_INTRODUCTION),
  projectsAction: projectsActionSchema
    .nullish()
    .transform((value) => value ?? { ...DEFAULT_PROJECTS_ACTION }),
  cvActionLabel: z
    .string()
    .trim()
    .min(1)
    .max(CV_ACTION_LABEL_MAX_LENGTH)
    .nullish()
    .transform((value) => value ?? 'View CV'),
  taglines: z.array(taglineSchema).length(IDENTITY_TAGLINE_COUNT),
  portrait: imageSchema,
  cv: cvSchema,
});

const aboutSchema = z.object({
  narrative: z.string().trim().min(1).max(ABOUT_NARRATIVE_MAX_LENGTH),
});

const educationSchema = z
  .object({
    _id: z.string(),
    institution: z.string().trim().min(1).max(EDUCATION_INSTITUTION_MAX_LENGTH),
    qualification: z.string().trim().min(1).max(EDUCATION_QUALIFICATION_MAX_LENGTH),
    startYear: z.number().int().min(EDUCATION_YEAR_MIN).max(EDUCATION_YEAR_MAX),
    endYear: z.number().int().min(EDUCATION_YEAR_MIN).max(EDUCATION_YEAR_MAX),
    educationStage: nullableText(EDUCATION_STAGE_MAX_LENGTH),
    status: z.enum(EDUCATION_STATUSES),
    academicYearLabel: nullableText(EDUCATION_ACADEMIC_YEAR_MAX_LENGTH),
    description: z.string().trim().min(1).max(EDUCATION_DESCRIPTION_MAX_LENGTH),
    order: z.number().int().min(0).default(0),
  })
  .refine(({ startYear, endYear }) => endYear >= startYear, {
    message: 'End year must not be before the start year.',
    path: ['endYear'],
  });

const skillSchema = z.object({
  _id: z.string(),
  name: z.string().trim().min(1).max(60),
  slug: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().min(1).max(60)).default([]),
  category: z.string().trim().min(1).max(60),
  logoUrl: z.string().trim().min(1),
  alternateLogoUrl: nullableText(500),
  logoAlt: nullableText(120),
  status: z.enum(SKILL_STATUSES),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

const skillCategorySchema = z.object({
  _id: z.string(),
  title: z.string().trim().min(1).max(60),
  description: nullableText(200),
  order: z.number().int().min(0).default(0),
  skills: z.array(skillSchema).default([]),
});

const projectSchema = z.object({
  _id: z.string(),
  title: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(96),
  order: z.number().int().min(0).default(0),
  featured: z.boolean().default(false),
  coverImage: z.record(z.string(), z.unknown()),
  shortDescription: z.string().trim().min(1).max(280),
  description: portableTextSchema,
  technologies: z.array(z.string().trim().min(1)).min(1).max(20),
  githubUrl: z.url().nullable().optional(),
  liveUrl: z.url().nullable().optional(),
  media: z.array(z.unknown()).default([]),
  caseStudy: z.record(z.string(), z.unknown()).nullable().optional(),
  seo: z.record(z.string(), z.unknown()).nullable().optional(),
});

const contactSchema = z.object({
  email: z.email(),
  availability: nullableText(160),
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(30),
        url: z.url(),
        order: z.number().int().min(0).default(0),
      }),
    )
    .default([]),
});

const siteSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(80),
  siteUrl: z.url().nullable().optional(),
  seo: z.record(z.string(), z.unknown()),
});

export const FALLBACK_CONTENT = Object.freeze({
  profile: Object.freeze({
    fullName: 'ABDUL SABOOR',
    heroHeadline: null,
    heroStatements: APPROVED_HERO_STATEMENTS,
    heroIntroduction: APPROVED_HERO_INTRODUCTION,
    projectsAction: DEFAULT_PROJECTS_ACTION,
    cvActionLabel: 'View CV',
    portrait: null,
    cv: null,
    taglines: Object.freeze(
      APPROVED_IDENTITY_TAGLINES.map((text) => Object.freeze({ text })),
    ),
  }),
  about: Object.freeze({ narrative: APPROVED_ABOUT_NARRATIVE }),
  education: APPROVED_EDUCATION_RECORDS,
  skills: APPROVED_SKILLS,
  skillCategories: Object.freeze([]),
  projects: Object.freeze([]),
  contact: null,
  siteSettings: null,
});

function parseSection(schema, value, fallback, path, issues) {
  if (value === null || value === undefined) return fallback;

  const result = schema.safeParse(value);
  if (result.success) return result.data;

  issues.push({
    path,
    message: result.error.issues
      .map((issue) => `${issue.path.join('.') || path}: ${issue.message}`)
      .join('; '),
  });
  return fallback;
}

export function validatePortfolioContent(rawValue) {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {};
  const issues = [];

  const content = {
    profile: parseSection(
      profileSchema,
      raw.profile,
      FALLBACK_CONTENT.profile,
      'profile',
      issues,
    ),
    about: parseSection(aboutSchema, raw.about, FALLBACK_CONTENT.about, 'about', issues),
    education: parseSection(
      z
        .array(educationSchema)
        .transform((records) =>
          [...records].sort(
            (left, right) =>
              left.order - right.order ||
              right.startYear - left.startYear ||
              left._id.localeCompare(right._id),
          ),
        ),
      raw.education,
      FALLBACK_CONTENT.education,
      'education',
      issues,
    ),
    skills: parseSection(
      z
        .array(skillSchema)
        .transform((skills) =>
          skills
            .filter((skill) => skill.visible)
            .sort(
              (left, right) =>
                left.order - right.order || left._id.localeCompare(right._id),
            ),
        ),
      raw.skills,
      FALLBACK_CONTENT.skills,
      'skills',
      issues,
    ),
    skillCategories: parseSection(
      z.array(skillCategorySchema),
      raw.skillCategories,
      [],
      'skillCategories',
      issues,
    ),
    projects: parseSection(z.array(projectSchema), raw.projects, [], 'projects', issues),
    contact: parseSection(contactSchema, raw.contact, null, 'contact', issues),
    siteSettings: parseSection(
      siteSettingsSchema,
      raw.siteSettings,
      null,
      'siteSettings',
      issues,
    ),
  };

  return { content, issues };
}

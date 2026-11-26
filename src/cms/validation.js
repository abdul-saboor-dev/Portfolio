import {
  ABOUT_NARRATIVE_MAX_LENGTH,
  APPROVED_ABOUT_NARRATIVE,
  APPROVED_EDUCATION_RECORDS,
  APPROVED_HERO_INTRODUCTION,
  APPROVED_HERO_STATEMENTS,
  APPROVED_IDENTITY_TAGLINES,
  APPROVED_SKILLS,
  APPROVED_SKILLS_DESCRIPTION,
  APPROVED_SKILLS_HEADING,
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
  SKILLS_DESCRIPTION_MAX_LENGTH,
  SKILLS_HEADING_MAX_LENGTH,
} from '@portfolio/content-model';
import { z } from 'zod';
import { CREATIVE_DEMOS, PROJECTS_COPY, PROJECTS_FALLBACK } from '../projects/content.js';

const nullableText = (maximum) => z.string().trim().max(maximum).nullable().optional();
const portableTextSchema = z
  .array(z.unknown())
  .nullish()
  .transform((value) => value ?? []);
const imageSchema = z.record(z.string(), z.unknown()).nullable().optional();
const cvSchema = z
  .object({
    url: z.url().refine((value) => /^https?:\/\//i.test(value), {
      message: 'CV URL must use HTTP or HTTPS.',
    }),
    title: z.string().trim().min(1).max(120),
    filename: nullableText(160),
    previewImageUrl: z.url().nullable().optional(),
    downloadAvailable: z.boolean().default(true),
    lastUpdated: z.iso.date().nullable().optional(),
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
  cvVisible: z
    .boolean()
    .nullish()
    .transform((value) => value ?? true),
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

const skillsPresentationSchema = z.object({
  heading: z.string().trim().min(1).max(SKILLS_HEADING_MAX_LENGTH),
  description: z.string().trim().min(1).max(SKILLS_DESCRIPTION_MAX_LENGTH),
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
  featured: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
  coverImage: z.record(z.string(), z.unknown()).nullable().optional(),
  shortDescription: z.string().trim().min(1).max(280),
  description: portableTextSchema,
  technologies: z.array(z.string().trim().min(1)).min(1).max(20),
  githubUrl: safeExternalUrlSchema.nullable().optional(),
  liveUrl: safeExternalUrlSchema.nullable().optional(),
  media: z
    .array(z.unknown())
    .nullish()
    .transform((value) => value ?? []),
  caseStudy: z.record(z.string(), z.unknown()).nullable().optional(),
  seo: z.record(z.string(), z.unknown()).nullable().optional(),
  category: z.string().trim().min(1).max(90).default('Project'),
  extendedDescription: nullableText(2000),
  projectRole: nullableText(120),
  status: nullableText(80),
  desktopPreviewUrl: z.string().trim().min(1),
  imageAlt: z.string().trim().min(1).max(160),
  showGithub: z
    .boolean()
    .nullish()
    .transform((value) => value ?? true),
  showLive: z
    .boolean()
    .nullish()
    .transform((value) => value ?? true),
  visible: z
    .boolean()
    .nullish()
    .transform((value) => value ?? false),
});

const creativeWorkSchema = z.object({
  _id: z.string(),
  title: z.string().trim().min(1).max(100),
  slug: nullableText(100),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(1).max(500),
  extendedDescription: nullableText(2000),
  artworkUrl: z.string().trim().min(1),
  fullSizeUrl: nullableText(500),
  additionalArtworks: z.array(z.unknown()).nullable().optional(),
  video: z.unknown().nullable().optional(),
  tools: z.array(z.string().trim().min(1).max(80)).nullable().optional(),
  series: nullableText(120),
  featured: z.boolean().nullable().optional(),
  alt: z.string().trim().min(1).max(160),
  externalUrl: safeExternalUrlSchema.nullable().optional(),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
});

const projectsCopySchema = z.object({
  buildDescription: z.string().trim().min(1).max(180),
  designDescription: z.string().trim().min(1).max(180),
  creativeIntroduction: z.string().trim().min(1).max(180),
  closingTitle: z.string().trim().min(1).max(80),
  closingDescription: z.string().trim().min(1).max(180),
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
    cvVisible: true,
    portrait: null,
    cv: null,
    taglines: Object.freeze(
      APPROVED_IDENTITY_TAGLINES.map((text) => Object.freeze({ text })),
    ),
  }),
  about: Object.freeze({ narrative: APPROVED_ABOUT_NARRATIVE }),
  education: APPROVED_EDUCATION_RECORDS,
  skillsPresentation: Object.freeze({
    heading: APPROVED_SKILLS_HEADING,
    description: APPROVED_SKILLS_DESCRIPTION,
  }),
  skills: APPROVED_SKILLS,
  skillCategories: Object.freeze([]),
  projects: PROJECTS_FALLBACK,
  creativeWork: CREATIVE_DEMOS,
  projectsCopy: PROJECTS_COPY,
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

function parseVisibleCollection(schema, value, fallback, path, issues) {
  if (value === null || value === undefined) return fallback;
  if (!Array.isArray(value)) {
    issues.push({ path, message: `${path} must be a list.` });
    return fallback;
  }
  return value
    .flatMap((item, index) => {
      const result = schema.safeParse(item);
      if (result.success) return [result.data];
      issues.push({
        path: `${path}.${index}`,
        message: result.error.issues.map((issue) => issue.message).join('; '),
      });
      return [];
    })
    .filter((item) => item.visible)
    .sort((a, b) => a.order - b.order || a._id.localeCompare(b._id));
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
    skillsPresentation: parseSection(
      skillsPresentationSchema,
      raw.skillsPresentation,
      FALLBACK_CONTENT.skillsPresentation,
      'skillsPresentation',
      issues,
    ),
    skillCategories: parseSection(
      z.array(skillCategorySchema),
      raw.skillCategories,
      [],
      'skillCategories',
      issues,
    ),
    projects: parseVisibleCollection(
      projectSchema,
      raw.projects,
      FALLBACK_CONTENT.projects,
      'projects',
      issues,
    ),
    creativeWork: parseVisibleCollection(
      creativeWorkSchema,
      raw.creativeWork,
      FALLBACK_CONTENT.creativeWork,
      'creativeWork',
      issues,
    ),
    projectsCopy: parseSection(
      projectsCopySchema,
      raw.projectsCopy,
      FALLBACK_CONTENT.projectsCopy,
      'projectsCopy',
      issues,
    ),
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

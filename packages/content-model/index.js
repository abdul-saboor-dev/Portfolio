export const IDENTITY_TAGLINE_COUNT = 6;
export const IDENTITY_TAGLINE_MAX_LENGTH = 24;
export const IDENTITY_TAGLINE_MIN_LENGTH = 3;
export const HERO_STATEMENT_COUNT = 3;
export const HERO_STATEMENT_MAX_LENGTH = 32;
export const HERO_INTRODUCTION_MAX_LENGTH = 130;
export const PROJECTS_ACTION_LABEL_MAX_LENGTH = 22;
export const CV_ACTION_LABEL_MAX_LENGTH = 18;
export const ABOUT_NARRATIVE_MAX_LENGTH = 650;
export const EDUCATION_INSTITUTION_MAX_LENGTH = 90;
export const EDUCATION_QUALIFICATION_MAX_LENGTH = 90;
export const EDUCATION_STAGE_MAX_LENGTH = 35;
export const EDUCATION_ACADEMIC_YEAR_MAX_LENGTH = 25;
export const EDUCATION_DESCRIPTION_MAX_LENGTH = 220;
export const EDUCATION_YEAR_MIN = 1900;
export const EDUCATION_YEAR_MAX = 2100;
export const EDUCATION_STATUSES = Object.freeze(['In Progress', 'Completed']);

export const APPROVED_HERO_STATEMENTS = Object.freeze([
  'I build for the web.',
  'I design with intent.',
  'I solve through code.',
]);

export const APPROVED_HERO_INTRODUCTION =
  'Building digital experiences through code, creativity, and thoughtful design.';

export const APPROVED_ABOUT_NARRATIVE =
  "I'm Abdul Saboor, a developer building my career in technology, currently pursuing a Diploma in Computer Information Technology (DAE CIT). With over two years of coding experience, I enjoy combining technical problem-solving with thoughtful design to create digital experiences that are both functional and intuitive. I focus on writing practical solutions, refining user experiences, and paying attention to the details that bring ideas to life. As I expand my full-stack skills, my goal is to build increasingly capable, scalable applications that solve meaningful problems.";

export const APPROVED_EDUCATION_RECORDS = Object.freeze([
  Object.freeze({
    _id: 'education-dae-cit',
    institution: 'Government College of Technology Bhakkar',
    qualification: 'DAE in Computer Information Technology',
    startYear: 2024,
    endYear: 2027,
    educationStage: null,
    status: 'In Progress',
    academicYearLabel: 'Final Year',
    description:
      'Currently in my final year, developing practical skills in programming, networking, software development, and database management.',
    order: 0,
  }),
  Object.freeze({
    _id: 'education-matriculation',
    institution: 'Govt. Model High School Bhakkar',
    qualification: 'Matriculation, Science',
    startYear: 2022,
    endYear: 2024,
    educationStage: null,
    status: 'Completed',
    academicYearLabel: null,
    description:
      'Studied Science and Mathematics, strengthening my analytical thinking and problem-solving foundations.',
    order: 1,
  }),
  Object.freeze({
    _id: 'education-primary-middle',
    institution: 'Allied School Bhakkar',
    qualification: 'Primary and Middle Education',
    startYear: 2014,
    endYear: 2022,
    educationStage: null,
    status: 'Completed',
    academicYearLabel: null,
    description:
      'Built my academic foundation and developed an early interest in computers and technology.',
    order: 2,
  }),
]);

export const APPROVED_IDENTITY_TAGLINES = Object.freeze([
  'WEB DEVELOPER',
  'CREATIVE DESIGNER',
  'PROBLEM SOLVER',
  'CREATIVE THINKER',
  'UI ENTHUSIAST',
  'CONTINUOUS LEARNER',
]);

export function validateIdentityTaglines(values) {
  const taglines = Array.isArray(values) ? values : [];
  const errors = [];

  if (taglines.length !== IDENTITY_TAGLINE_COUNT) {
    errors.push(`Exactly ${IDENTITY_TAGLINE_COUNT} taglines are required.`);
  }

  const normalized = [];

  taglines.forEach((value, index) => {
    const text = typeof value === 'string' ? value.trim() : '';

    if (text.length < IDENTITY_TAGLINE_MIN_LENGTH) {
      errors.push(
        `Tagline ${index + 1} must be at least ${IDENTITY_TAGLINE_MIN_LENGTH} characters.`,
      );
    }

    if (text.length > IDENTITY_TAGLINE_MAX_LENGTH) {
      errors.push(
        `Tagline ${index + 1} must be ${IDENTITY_TAGLINE_MAX_LENGTH} characters or fewer.`,
      );
    }

    if (/\r|\n/.test(text)) {
      errors.push(`Tagline ${index + 1} must stay on one line.`);
    }

    normalized.push(text.toLocaleUpperCase('en'));
  });

  if (new Set(normalized).size !== normalized.length) {
    errors.push('Taglines must be unique.');
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

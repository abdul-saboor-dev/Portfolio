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
export const SKILL_STATUSES = Object.freeze(['Working With', 'Learning']);
export const SKILLS_HEADING_MAX_LENGTH = 60;
export const SKILLS_DESCRIPTION_MAX_LENGTH = 180;
export const APPROVED_SKILLS_HEADING = 'Built with curiosity.';
export const APPROVED_SKILLS_DESCRIPTION =
  'A growing collection of technologies I use, explore, and learn.';

const skill = (slug, name, category, aliases, order) =>
  Object.freeze({
    _id: `skill-${slug}`,
    aliases: Object.freeze(aliases.split(' ').filter(Boolean)),
    alternateLogoUrl: `/skills/png/${slug}.png`,
    category,
    logoAlt: `${name} logo`,
    logoUrl: `/skills/svg/${slug}.svg`,
    name,
    order,
    slug,
    status: 'Working With',
    visible: true,
  });

export const APPROVED_SKILLS = Object.freeze([
  skill('html5', 'HTML5', 'Frontend', 'html html5 markup', 0),
  skill('css3', 'CSS3', 'Frontend', 'css styles', 1),
  skill('javascript', 'JavaScript', 'Frontend', 'js ecmascript', 2),
  skill('typescript', 'TypeScript', 'Frontend', 'ts', 3),
  skill('react', 'React', 'Frontend', 'reactjs', 4),
  skill('vite', 'Vite', 'Frontend', 'vitejs', 5),
  skill('tailwind', 'Tailwind CSS', 'Frontend', 'tailwindcss', 6),
  skill('bootstrap', 'Bootstrap', 'Frontend', '', 7),
  skill('nodejs', 'Node.js', 'Backend', 'node', 8),
  skill('express', 'Express.js', 'Backend', 'expressjs', 9),
  skill('mongodb', 'MongoDB', 'Database', 'mongo', 10),
  skill('git', 'Git', 'Tools', 'version control', 11),
  skill('github', 'GitHub', 'Tools', 'git hosting', 12),
  skill('figma', 'Figma', 'Design', 'ui ux', 13),
  skill('canva', 'Canva', 'Design', 'graphics', 14),
  skill('vscode', 'VS Code', 'Tools', 'visual studio code editor', 15),
  skill('cpp', 'C++', 'Languages', 'cplusplus cpp', 16),
  skill('adobe-illustrator', 'Adobe Illustrator', 'Design', 'illustrator ai', 17),
]);

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

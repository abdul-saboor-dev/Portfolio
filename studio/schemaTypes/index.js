import { about } from './documents/about.js';
import { contact } from './documents/contact.js';
import { education } from './documents/education.js';
import { profile } from './documents/profile.js';
import { project } from './documents/project.js';
import { siteSettings } from './documents/siteSettings.js';
import { skill } from './documents/skill.js';
import { skillCategory } from './documents/skillCategory.js';
import { skillsPresentation } from './documents/skillsPresentation.js';
import { blockContent } from './objects/blockContent.js';
import { caseStudy } from './objects/caseStudy.js';
import { projectMedia } from './objects/projectMedia.js';
import { seo } from './objects/seo.js';
import { socialLink } from './objects/socialLink.js';
import { tagline } from './objects/tagline.js';

export const schemaTypes = [
  blockContent,
  tagline,
  socialLink,
  seo,
  projectMedia,
  caseStudy,
  profile,
  about,
  education,
  skillCategory,
  skillsPresentation,
  skill,
  project,
  contact,
  siteSettings,
];

export const PORTFOLIO_CONTENT_QUERY = `{
  "profile": *[_type == "profile" && _id == "profile"][0]{
    fullName,
    heroHeadline,
    heroStatements,
    heroIntroduction,
    projectsAction{label, destinationType, destinationValue},
    cvActionLabel,
    "taglines": taglines[]{text},
    portrait,
    "cv": select(defined(cvFile.asset) => {
      "url": cvFile.asset->url,
      "filename": cvFile.asset->originalFilename,
      "title": coalesce(cvTitle, "Abdul Saboor | Curriculum Vitae")
    })
  },
  "about": *[_type == "about" && _id == "about"][0]{
    "narrative": coalesce(narrative, introduction)
  },
  "education": *[_type == "education"] | order(order asc, startYear desc, _id asc){
    _id,
    institution,
    qualification,
    startYear,
    endYear,
    educationStage,
    status,
    academicYearLabel,
    description,
    order
  },
  "skillCategories": *[_type == "skillCategory"] | order(order asc, _createdAt asc){
    _id,
    title,
    description,
    order,
    "skills": *[_type == "skill" && references(^._id)] | order(order asc, _createdAt asc){
      _id,
      name,
      description,
      order
    }
  },
  "projects": *[_type == "project"] | order(order asc, _createdAt asc){
    _id,
    title,
    "slug": slug.current,
    order,
    featured,
    coverImage,
    shortDescription,
    description,
    technologies,
    githubUrl,
    liveUrl,
    media,
    caseStudy,
    seo
  },
  "contact": *[_type == "contact" && _id == "contact"][0]{
    email,
    availability,
    "socialLinks": socialLinks[] | order(order asc){label, url, order}
  },
  "siteSettings": *[_type == "siteSettings" && _id == "siteSettings"][0]{
    siteTitle,
    siteUrl,
    seo
  }
}`;

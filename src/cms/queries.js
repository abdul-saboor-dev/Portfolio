export const PORTFOLIO_CONTENT_QUERY = `{
  "profile": *[_type == "profile" && _id == "profile"][0]{
    fullName,
    heroHeadline,
    heroStatements,
    heroIntroduction,
    projectsAction{label, destinationType, destinationValue},
    cvActionLabel,
    cvVisible,
    "taglines": taglines[]{text},
    portrait,
    "cv": select(defined(cvFile.asset) => {
      "url": cvFile.asset->url,
      "filename": cvFile.asset->originalFilename,
      "title": coalesce(cvTitle, "Abdul Saboor | Curriculum Vitae"),
      "previewImageUrl": cvPreviewImage.asset->url,
      "downloadAvailable": coalesce(cvDownloadAvailable, true),
      "lastUpdated": cvLastUpdated
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
  "skillsPresentation": *[_type == "skillsPresentation" && _id == "skillsPresentation"][0]{
    heading,
    description
  },
  "skills": *[_type == "skill" && visible == true] | order(order asc, name asc, _id asc){
    _id,
    name,
    "slug": slug.current,
    aliases,
    "category": category->title,
    "logoUrl": logo.asset->url,
    "alternateLogoUrl": alternateLogo.asset->url,
    "logoAlt": logo.alt,
    status,
    visible,
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
    seo,
    category,
    extendedDescription,
    projectRole,
    status,
    "desktopPreviewUrl": desktopPreview.asset->url,
    "imageAlt": desktopPreview.alt,
    showGithub,
    showLive,
    visible
  },
  "creativeWork": *[_type == "creativeWork" && visible == true] | order(order asc, _createdAt asc){
    _id, title, "slug": slug.current, category, description, extendedDescription,
    order, visible, featured, alt, externalUrl, tools, series, video,
    additionalArtworks,
    "artworkUrl": artwork.asset->url,
    "fullSizeUrl": fullSize.asset->url
  },
  "projectsCopy": *[_type == "projectsSettings" && _id == "projectsSettings"][0]{
    buildDescription, designDescription,
    creativeIntroduction, closingTitle, closingDescription
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

import { useRef } from 'react';
import { KINETIC_TIMING } from '../animation/kineticTiming.js';
import { useKineticEntrance } from '../animation/useKineticEntrance.js';
import { useScrollIdentity } from '../animation/useScrollIdentity.js';
import AboutSection from './AboutSection.jsx';
import EducationSection from './EducationSection.jsx';
import HeroActions from './HeroActions.jsx';
import HeroNavigation from './HeroNavigation.jsx';
import HeroScrollCue from './HeroScrollCue.jsx';
import KineticWordmark from './KineticWordmark.jsx';
import SkillsSection from './SkillsSection.jsx';

function KineticHero({
  about,
  education,
  skills,
  skillsPresentation,
  profile,
  contentStatus,
}) {
  const heroRef = useRef(null);
  useKineticEntrance(heroRef);
  useScrollIdentity(heroRef);

  return (
    <header
      id="home"
      ref={heroRef}
      className="kinetic-hero"
      data-content-status={contentStatus}
      data-entrance="preparing"
      data-entrance-stage="orbit"
      data-entrance-progress="0.000"
      data-loader-minimum-ms={KINETIC_TIMING.minimumLoaderPresentationMs}
    >
      <div className="kinetic-hero__frame">
        <HeroNavigation />

        <div className="kinetic-hero__composition">
          <KineticWordmark />

          <div className="kinetic-hero__support" aria-label="Professional identity">
            <div className="kinetic-hero__identity">
              <div className="kinetic-hero__statements">
                {profile.heroStatements.map((statement) => (
                  <p className="kinetic-hero__statement-line" key={statement}>
                    <span data-hero-statement>{statement}</span>
                  </p>
                ))}
              </div>

              {profile.heroIntroduction ? (
                <p className="kinetic-hero__introduction">{profile.heroIntroduction}</p>
              ) : null}
            </div>

            <HeroActions
              cvActionLabel={profile.cvActionLabel}
              cvDocument={profile.cv}
              projectsAction={profile.projectsAction}
            />
            <HeroScrollCue />
          </div>
        </div>
      </div>

      <AboutSection narrative={about.narrative} />
      <EducationSection records={education} />
      <SkillsSection presentation={skillsPresentation} skills={skills} />
    </header>
  );
}

export default KineticHero;

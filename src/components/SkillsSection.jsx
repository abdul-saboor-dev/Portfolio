import { useMemo, useSyncExternalStore } from 'react';
import { buildPyramidRows, getIrregularRowPlacement } from '../skills/pyramidLayout.js';

function SkillIcon({ skill, index }) {
  const handleError = (event) => {
    const image = event.currentTarget;
    if (image.dataset.fallbackApplied !== 'true' && skill.alternateLogoUrl) {
      image.dataset.fallbackApplied = 'true';
      image.src = skill.alternateLogoUrl;
      return;
    }
    image.hidden = true;
    image.nextElementSibling?.removeAttribute('hidden');
  };

  return (
    <li
      className="skills-stage__item"
      data-skill-index={index}
      data-skill-id={skill._id}
      data-skill-row={skill.rowIndex}
      data-skill-column={skill.columnIndex}
    >
      <img
        className="skills-stage__icon"
        src={skill.logoUrl}
        alt={skill.logoAlt || `${skill.name} logo`}
        width="72"
        height="72"
        decoding="async"
        loading="eager"
        onError={handleError}
      />
      <span className="skills-stage__fallback" hidden>
        {skill.name}
      </span>
    </li>
  );
}

function SkillsSection({ presentation, skills }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const rows = useMemo(() => buildPyramidRows(skills), [skills]);
  const maxRow = Math.max(1, ...rows.map((row) => row.length));
  if (!mounted || rows.length === 0) return null;

  return (
    <section
      id="skills"
      className="skills-stage"
      aria-labelledby="skills-heading"
      aria-hidden="true"
      data-skills-state="pending"
      inert
    >
      <div className="skills-stage__content" style={{ '--skills-max-row': maxRow }}>
        <header className="skills-stage__header">
          <h2 id="skills-heading">Skills</h2>
        </header>

        <div className="skills-stage__body">
          <div className="skills-stage__copy" data-skills-copy>
            <h3>{presentation.heading}</h3>
            <p>{presentation.description}</p>
          </div>

          <div className="skills-stage__formation" data-skills-formation>
            {rows.map((row, rowIndex) => {
              const placement = getIrregularRowPlacement(rowIndex, row.length, maxRow);
              return (
                <ul
                  className="skills-stage__row"
                  key={`skill-row-${rowIndex}`}
                  style={{
                    '--skills-row-x': `calc(${placement.x} * var(--skills-icon-size))`,
                    '--skills-row-y': `calc(${placement.y} * var(--skills-icon-size))`,
                  }}
                >
                  {row.map((skill) => (
                    <SkillIcon key={skill._id} skill={skill} index={skill.itemIndex} />
                  ))}
                </ul>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SkillsSection;

import { useMemo, useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

const segmentNarrative = (narrative) => {
  let wordIndex = 0;
  return narrative.split(/(\s+)/).map((segment, sourceIndex) => {
    const word = !/^\s+$/.test(segment);
    const entry = { sourceIndex, text: segment, word, wordIndex };
    if (word) wordIndex += 1;
    return entry;
  });
};

function AboutSection({ narrative }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const segments = useMemo(() => segmentNarrative(narrative), [narrative]);

  if (!mounted) return null;

  return (
    <section
      id="about"
      className="kinetic-about"
      aria-labelledby="about-section-label"
      aria-hidden="true"
      inert
    >
      <div className="kinetic-about__content">
        <h2 id="about-section-label" className="kinetic-about__label">
          About
        </h2>
        <p className="kinetic-about__narrative" data-about-narrative>
          {segments.map((segment) => {
            if (!segment.word) return segment.text;
            return (
              <span
                className="kinetic-about__word"
                data-about-word={segment.wordIndex}
                key={`${segment.sourceIndex}-${segment.text}`}
              >
                {segment.text}
              </span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

export default AboutSection;

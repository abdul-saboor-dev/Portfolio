import {
  KINETIC_IDENTITY_NAME,
  KINETIC_IDENTITY_WORDS,
} from '../identity/kineticIdentity.js';

function KineticWordmark() {
  return (
    <h1 className="kinetic-wordmark" data-testid="kinetic-wordmark" translate="no">
      <span className="visually-hidden">{KINETIC_IDENTITY_NAME}</span>
      <span className="kinetic-wordmark__visual" aria-hidden="true">
        {KINETIC_IDENTITY_WORDS.map((word) => (
          <span
            key={word.id}
            className={`kinetic-wordmark__line kinetic-wordmark__line--${word.id}`}
            data-word={word.id}
          >
            {word.glyphs.map((item) => (
              <span
                key={item.id}
                id={item.id}
                className="kinetic-wordmark__glyph"
                data-glyph-id={item.id}
                data-glyph-index={item.index}
                data-character={item.character}
                data-monogram-role={item.monogramRole ?? undefined}
              >
                {item.character}
              </span>
            ))}
          </span>
        ))}
      </span>
    </h1>
  );
}

export default KineticWordmark;

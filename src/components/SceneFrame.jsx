function SceneFrame({ id, eyebrow, title, children, className = '' }) {
  return (
    <section
      id={id}
      className={`scene-frame ${className}`.trim()}
      aria-labelledby={`${id}-title`}
    >
      <div className="scene-frame__eyebrow">{eyebrow}</div>
      <h1 id={`${id}-title`} className="scene-frame__title">
        {title}
      </h1>
      {children}
    </section>
  );
}

export default SceneFrame;

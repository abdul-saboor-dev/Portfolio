import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import ViewerCloseButton from './ViewerCloseButton.jsx';
import '../styles/projects.css';

const subscribe = () => () => {};
const navigate = (destination) =>
  window.dispatchEvent(
    new CustomEvent('kinetic:projects-navigate', { detail: { destination } }),
  );

function ProjectImage({ project, priority = false }) {
  const [failed, setFailed] = useState(false);
  return project.desktopPreviewUrl && !failed ? (
    <img
      src={project.desktopPreviewUrl}
      alt={project.imageAlt || project.title + ' screenshot'}
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      draggable="false"
    />
  ) : (
    <span
      className="projects__image-fallback"
      role="img"
      aria-label={'Screenshot unavailable for ' + project.title}
    >
      {project.title}
    </span>
  );
}

function DemoPoster({ work }) {
  return (
    <div
      className={'projects__poster projects__poster--' + work._id}
      role="img"
      aria-label={work.title + ', editorial artwork'}
    >
      <small>
        EXHIBITION <span>VOL. 01</span>
      </small>
      <strong>{work.title}</strong>
      <i aria-hidden="true" />
      <small>A STUDY IN FORM</small>
    </div>
  );
}
function Artwork({ work }) {
  return work.artworkUrl ? (
    <img src={work.artworkUrl} alt={work.alt || work.title} draggable="false" />
  ) : (
    <DemoPoster work={work} />
  );
}
function ProjectDetail({ project }) {
  return (
    <>
      <p className="projects__category">{project.category}</p>
      <h3>{project.title}</h3>
      <p>{project.shortDescription}</p>
      {project.status && <small>{project.status}</small>}
      {project.technologies?.length > 0 && (
        <p className="projects__tech">{project.technologies.join(' / ')}</p>
      )}
      <div className="projects__links">
        {project.showLive && project.liveUrl && (
          <a href={project.liveUrl} target="_blank" rel="noreferrer">
            Live ↗
          </a>
        )}
        {project.showGithub && project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        )}
      </div>
    </>
  );
}
function ChapterControls({ kind, total }) {
  return (
    <div className="projects__controls">
      <div className="projects__nav">
        <button
          type="button"
          data-chapter-previous={kind}
          aria-label={kind === 'build' ? 'Previous project' : 'Previous artwork'}
          onClick={() => navigate(kind === 'build' ? 'previous' : 'art-previous')}
        >
          ←
        </button>
        <output data-chapter-counter={kind}>01 / {String(total).padStart(2, '0')}</output>
        <button
          type="button"
          data-chapter-next={kind}
          aria-label={kind === 'build' ? 'Next project' : 'Next artwork'}
          onClick={() => navigate(kind === 'build' ? 'next' : 'art-next')}
        >
          →
        </button>
      </div>
    </div>
  );
}
function ChapterContinue({ kind, disabled = false }) {
  return (
    <button
      type="button"
      className="projects__continue"
      disabled={disabled}
      onClick={() => navigate(kind === 'build' ? 'design' : 'end')}
    >
      Continue <span aria-hidden="true">→</span>
    </button>
  );
}
function ProjectsSection({ projects, creativeWork, copy }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const [viewIndex, setViewIndex] = useState(null);
  const dialogRef = useRef(null);
  const viewerCloseRef = useRef(null);
  const focusRef = useRef(null);
  const pointerRef = useRef(null);
  const viewerScrollRef = useRef(0);
  const work = viewIndex === null ? null : creativeWork[viewIndex];
  useEffect(() => {
    if (!work || !dialogRef.current) return undefined;
    const dialog = dialogRef.current;
    const root = document.documentElement;
    const priorOverflow = root.style.overflow;
    viewerScrollRef.current = window.scrollY;
    root.style.overflow = 'hidden';
    dialog.showModal();
    requestAnimationFrame(() => viewerCloseRef.current?.focus());
    return () => {
      if (dialog.open) dialog.close();
      root.style.overflow = priorOverflow;
      window.scrollTo(0, viewerScrollRef.current);
      requestAnimationFrame(() => focusRef.current?.focus({ preventScroll: true }));
    };
  }, [work]);
  if (!mounted) return null;
  return (
    <section
      id="projects"
      className="projects"
      aria-label="Projects"
      aria-hidden="true"
      inert
      data-projects-state="pending"
      data-project-count={projects.length}
      data-art-count={creativeWork.length}
      data-timeline-units={3 + projects.length + creativeWork.length}
    >
      <div className="projects__scene">
        <h2 className="projects__indicator" aria-label="Projects, Development">
          <span aria-hidden="true">Projects</span>
          <span className="projects__indicator-dot" aria-hidden="true" />
          <span className="projects__indicator-discipline" aria-hidden="true">
            <span data-projects-discipline="development">Development</span>
            <span data-projects-discipline="creative">Creative</span>
          </span>
        </h2>
        <section
          className="projects__chapter projects__chapter--build"
          aria-label="I Build"
          aria-hidden="true"
          inert
        >
          <div className="projects__body">
            <div className="projects__editorial">
              <div className="projects__details">
                {projects.map((project, index) => (
                  <article
                    key={project._id}
                    className="projects__detail"
                    data-project-detail={index}
                    aria-hidden="true"
                    inert
                  >
                    <ProjectDetail project={project} />
                  </article>
                ))}
              </div>
              <ChapterControls kind="build" total={projects.length + 1} />
            </div>
            <div
              className="projects__field projects__field--build"
              aria-label="Project screenshots"
            >
              {projects.map((project, index) => (
                <div
                  key={project._id}
                  className="projects__card"
                  data-project-card={index}
                  aria-hidden="true"
                >
                  <ProjectImage project={project} priority={index === 0} />
                </div>
              ))}
              <div
                className="projects__card projects__card--ending"
                data-project-card={projects.length}
                aria-hidden="true"
              >
                <small>TO BE CONTINUED</small>
                <strong>{copy.closingTitle}</strong>
                <span>{copy.closingDescription}</span>
              </div>
            </div>
          </div>
          <ChapterContinue kind="build" />
        </section>
        <section
          className="projects__chapter projects__chapter--design"
          aria-label="I Design"
          aria-hidden="true"
          inert
        >
          <div className="projects__body">
            <div
              className="projects__field projects__field--design"
              aria-label="Creative artworks"
              onPointerDown={(event) => {
                pointerRef.current = { x: event.clientX, y: event.clientY };
              }}
              onPointerUp={(event) => {
                if (!pointerRef.current) return;
                const dx = event.clientX - pointerRef.current.x;
                const dy = event.clientY - pointerRef.current.y;
                if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3)
                  navigate(dx < 0 ? 'art-next' : 'art-previous');
                pointerRef.current = null;
              }}
              onPointerCancel={() => {
                pointerRef.current = null;
              }}
            >
              {creativeWork.map((item, index) => (
                <div
                  key={item._id}
                  className="projects__artwork"
                  data-artwork={index}
                  aria-hidden="true"
                >
                  <Artwork work={item} />
                </div>
              ))}
              <div
                className="projects__artwork projects__artwork--ending"
                data-artwork={creativeWork.length}
                aria-hidden="true"
              >
                <small>MORE TO COME</small>
                <strong>When creative instinct kicks in.</strong>
                <span>Some ideas don't stay ideas for long.</span>
              </div>
            </div>
            <div className="projects__editorial">
              <div className="projects__art-details">
                {creativeWork.map((item, index) => (
                  <article
                    key={item._id}
                    className="projects__detail"
                    data-art-detail={index}
                    aria-hidden="true"
                    inert
                  >
                    <p className="projects__category">{item.category}</p>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    {item.tools?.length > 0 && (
                      <p className="projects__tech">{item.tools.join(' / ')}</p>
                    )}
                    <div className="projects__links">
                      <button
                        type="button"
                        onClick={() => {
                          focusRef.current = document.activeElement;
                          setViewIndex(index);
                        }}
                      >
                        View artwork
                      </button>
                      {item.externalUrl && (
                        <a href={item.externalUrl} target="_blank" rel="noreferrer">
                          Open ↗
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              <ChapterControls kind="design" total={creativeWork.length + 1} />
            </div>
          </div>
          <ChapterContinue kind="design" disabled />
        </section>
      </div>
      <div className="projects__reduced">
        <h2>Projects · Development</h2>
        {projects.map((project) => (
          <article key={project._id}>
            <ProjectImage project={project} />
            <ProjectDetail project={project} />
          </article>
        ))}
        <h3>{copy.closingTitle}</h3>
        <h2>Projects · Creative</h2>
        {creativeWork.map((item) => (
          <article key={item._id}>
            <Artwork work={item} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
        <h3>When creative instinct kicks in.</h3>
      </div>
      {work && (
        <dialog
          ref={dialogRef}
          className="projects__viewer"
          aria-label={work.title}
          onClose={() => setViewIndex(null)}
        >
          <ViewerCloseButton
            ref={viewerCloseRef}
            label="Close artwork viewer"
            onClick={() => dialogRef.current?.close()}
          />
          {work.artworkUrl ? (
            <img src={work.fullSizeUrl || work.artworkUrl} alt={work.alt || work.title} />
          ) : (
            <DemoPoster work={work} />
          )}
        </dialog>
      )}
    </section>
  );
}
export default ProjectsSection;

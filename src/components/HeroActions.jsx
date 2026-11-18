import { useEffect, useState } from 'react';
import CvViewer from './CvViewer.jsx';

function ActionContent({ children }) {
  return (
    <>
      <span>{children}</span>
      <span className="kinetic-hero__action-arrow" aria-hidden="true">
        ↗
      </span>
    </>
  );
}

function UnavailableAction({ children }) {
  return (
    <span className="kinetic-hero__action is-unavailable" aria-disabled="true">
      <ActionContent>{children}</ActionContent>
    </span>
  );
}

function HeroActions({ cvActionLabel, cvDocument, projectsAction }) {
  const [hasInternalDestination, setHasInternalDestination] = useState(false);
  const isInternal = projectsAction.destinationType === 'internal';
  const internalId = isInternal ? projectsAction.destinationValue : null;

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return undefined;

    const syncAvailability = () =>
      setHasInternalDestination(
        Boolean(internalId && document.getElementById(internalId)),
      );
    syncAvailability();
    const observer = new MutationObserver(syncAvailability);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [internalId]);

  const projectsHref = isInternal
    ? hasInternalDestination
      ? `#${internalId}`
      : null
    : projectsAction.destinationValue;

  return (
    <div className="kinetic-hero__actions" aria-label="Hero actions">
      {projectsHref ? (
        <a
          className="kinetic-hero__action"
          href={projectsHref}
          {...(!isInternal ? { rel: 'noreferrer', target: '_blank' } : {})}
        >
          <ActionContent>{projectsAction.label}</ActionContent>
        </a>
      ) : (
        <UnavailableAction>{projectsAction.label}</UnavailableAction>
      )}

      {cvDocument ? (
        <CvViewer document={cvDocument} label={cvActionLabel} />
      ) : (
        <UnavailableAction>{cvActionLabel}</UnavailableAction>
      )}
    </div>
  );
}

export default HeroActions;

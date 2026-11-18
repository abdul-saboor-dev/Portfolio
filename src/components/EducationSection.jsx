import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

function EducationSection({ records }) {
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted || records.length === 0) return null;

  return (
    <section
      id="education"
      className="education-stage"
      aria-labelledby="education-section-label"
      aria-hidden="true"
      inert
    >
      <div className="education-stage__content">
        <h2 id="education-section-label" className="education-stage__label">
          Education
        </h2>

        <div className="education-stage__viewport">
          <ol className="education-stage__track" data-education-track>
            {records.map((record, index) => {
              const titleId = `education-record-${index}`;
              const details = [
                record.status,
                record.academicYearLabel,
                record.educationStage,
              ].filter(Boolean);

              return (
                <li
                  className="education-record"
                  data-education-record
                  data-record-index={index}
                  key={record._id}
                >
                  <article aria-labelledby={titleId}>
                    <p className="education-record__period">
                      <span>{record.startYear}</span>
                      <span className="education-record__period-join">to</span>
                      <span>{record.endYear}</span>
                    </p>

                    <div className="education-record__body">
                      <h3 id={titleId}>{record.institution}</h3>
                      <p className="education-record__qualification">
                        {record.qualification}
                      </p>
                      {details.length > 0 ? (
                        <p className="education-record__meta">
                          {details.map((detail) => (
                            <span key={detail}>{detail}</span>
                          ))}
                        </p>
                      ) : null}
                      <p className="education-record__description">
                        {record.description}
                      </p>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

export default EducationSection;

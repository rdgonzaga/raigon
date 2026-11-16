import { workExperience } from "@/lib/content";
import { renderBullet } from "@/lib/renderBullet";

/** One glass card per job: who and when on the left with its headline number, bullets on the right. */
export function JobStack() {
  return (
    <ol className="rg-jobs">
      {workExperience.map((job) => (
        <li className="rg-glass rg-job" key={`${job.org}-${job.role}`}>
          <div className="rg-job-side">
            <p className={`rg-when${job.date.includes("Present") ? " is-now" : ""}`}>{job.date}</p>
            <h3>{job.url ? <a href={job.url} target="_blank" rel="noopener noreferrer">{job.org}</a> : job.org}</h3>
            <p className="rg-role">{job.role}</p>
            {job.type && <p className="rg-org">{job.type}</p>}
            {job.highlight && (
              <p className="rg-stat">
                <b>{job.highlight.value}</b>
                <span>{job.highlight.label}</span>
              </p>
            )}
          </div>
          {job.bullets.length > 0 && (
            <ul>
              {job.bullets.map((bullet) => (
                <li key={bullet}>{renderBullet(bullet)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

import { useState } from "react";
import type { Job } from "../types/job";
import EditApplicationForm from "./EditApplicationForm";

type JobCardProps = {
  job: Job;
  onDelete: (jobId: number) => void;
  onStatusChange: (jobId: number, status: string) => void;
  onUpdated: (job: Job) => void;
};

export default function JobCard({
  job,
  onDelete,
  onStatusChange,
  onUpdated,
}: JobCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] =useState(false);
  return (
    <article className="job-card">
      <div className="job-card-header">
        <div>
          <h2>{job.title}</h2>
          <p className="company">{job.company}</p>
        </div>

        <div className="job-card-actions">
          <select
            className="status-select"
            value={job.status}
            onChange={(event) =>
              onStatusChange(job.id, event.target.value)
            }
            aria-label={`Status for ${job.title} at ${job.company}`}
          >
            <option value="APPLIED">Applied</option>
            <option value="SCREENING">Screening</option>
            <option value="INTERVIEW">Interview</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>

          <button
            className="delete-button"
            type="button"
            onClick={() => onDelete(job.id)}
            aria-label={`Delete ${job.title} at ${job.company}`}
          >
            Delete
          </button>
          <button
          className="details-button"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          >
           {isExpanded ? "Hide details" : "View details"} 

          </button>

          <button
          className="details-button"
          type="button"
          onClick={() => {
            setIsEditing((current) => !current);
            setIsExpanded(false);
          }}
          >
            {isEditing ? "Close editor" : "Edit"}
          </button>
        </div>
      </div>

      <p className="job-details">
        <span>{job.location || "Location not provided"}</span>
        <span>{new Date(job.appliedAt).toLocaleDateString()}</span>
      </p>
      {isEditing &&(
        <EditApplicationForm
        job={job}
        onUpdated={(updatedJob) => {
            onUpdated(updatedJob);
            setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
        />
      )}
      {isExpanded &&(
        <div className="job-expanded-details">
            <div>
                <h3>Notes</h3>
                <p>{job.notes || "No notes added."}</p>
            </div>

            <div>
                <h3>Job Posting</h3>
                {job.jobUrl ? (
                    <a
                    href="{job.jobUrl}"
                    target="_blank"
                    rel="noreferrer">
                        Open job Posting
                    </a>
                ):(
                    <p>No job URL provided.</p>
                )}
            </div>

            <div>
                <h3>Last updated</h3>
                <p>{new Date(job.updatedAt).toLocaleString()}</p>
            </div>

            <section className="stage-history">
  <h3>Application history</h3>

  {!job.stageHistory || job.stageHistory.length === 0 ? (
    <p className="empty-history">No stage changes recorded yet.</p>
  ) : (
    <ol className="stage-history-list">
      {job.stageHistory.map((entry) => (
        <li key={entry.id} className="stage-history-item">
          <div className="history-change">
            <span>{entry.previousStage ?? "Created"}</span>
            <span aria-hidden="true">→</span>
            <strong>{entry.newStage}</strong>
          </div>

          <time dateTime={entry.changedAt}>
            {new Date(entry.changedAt).toLocaleString()}
          </time>
        </li>
      ))}
    </ol>
  )}
</section>

        </div>
      )}
    </article>
  );
}
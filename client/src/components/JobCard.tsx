

import type { Job } from "../types/job";

type JobCardProps = {
  job: Job;
  onDelete: (jobId: number) => void;
  onStatusChange: (jobId: number, status: string) => void;
};

export default function JobCard({
  job,
  onDelete,
  onStatusChange,
}: JobCardProps) {
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
        </div>
      </div>

      <p className="job-details">
        <span>{job.location || "Location not provided"}</span>
        <span>{new Date(job.appliedAt).toLocaleDateString()}</span>
      </p>
    </article>
  );
}
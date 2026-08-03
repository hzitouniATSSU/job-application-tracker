import { useState, type FormEvent } from "react";
import type { Job } from "../types/job";

type EditApplicationFormProps = {
  job: Job;
  onUpdated: (job: Job) => void;
  onCancel: () => void;
};

export default function EditApplicationForm({
  job,
  onUpdated,
  onCancel,
}: EditApplicationFormProps) {
  const [formData, setFormData] = useState({
    company: job.company,
    title: job.title,
    location: job.location || "",
    jobUrl: job.jobUrl || "",
    notes: job.notes || "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update application");
      }

      onUpdated(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="job-form edit-job-form" onSubmit={handleSubmit}>
      <h2>Edit application</h2>

      <div className="form-grid">
        <label>
          Company
          <input
            required
            value={formData.company}
            onChange={(event) =>
              setFormData({
                ...formData,

                company: event.target.value,
              })
            }
          />
        </label>

        <label>
          Job title
          <input
            required
            value={formData.title}
            onChange={(event) =>
              setFormData({
                ...formData,

                title: event.target.value,
              })
            }
          />
        </label>

        <label>
          Location
          <input
            value={formData.location}
            onChange={(event) =>
              setFormData({
                ...formData,

                location: event.target.value,
              })
            }
          />
        </label>

        <label>
          Job URL
          <input
            type="url"
            value={formData.jobUrl}
            onChange={(event) =>
              setFormData({
                ...formData,

                jobUrl: event.target.value,
              })
            }
          />
        </label>
      </div>

      <label>
        Notes
        <textarea
          rows={4}
          value={formData.notes}
          onChange={(event) =>
            setFormData({
              ...formData,

              notes: event.target.value,
            })
          }
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <div className="edit-form-actions">
        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>

        <button
          className="cancel-button"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

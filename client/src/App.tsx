import { useEffect, useState, type FormEvent } from "react";
import "./App.css";

type Job = {
  id: number;
  company: string;
  title: string;
  status: string;
  location: string | null;
  jobUrl: string | null;
  notes: string | null;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  company: "",
  title: "",
  location: "",
  jobUrl: "",
  notes: "",
};

function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await fetch("/api/jobs");

        if (!response.ok) {
          throw new Error("Unable to retrieve jobs");
        }

        const data: Job[] = await response.json();
        setJobs(data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Unable to create application");
      }

      const createdJob: Job = await response.json();

      setJobs((currentJobs) => [createdJob, ...currentJobs]);
      setFormData(emptyForm);
      setIsFormOpen(false);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(jobId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete application");
      }

      setJobs((currentJobs) => currentJobs.filter((job) => job.id !== jobId));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }
  async function handleStatusChange(jobId: number, status: string) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update application");
      }

      const updatedJob: Job = result;

      setJobs((currentJobs) =>
        currentJobs.map((job) => (job.id === jobId ? updatedJob : job))
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }

  if (isLoading) {
    return <p className="message">Loading applications...</p>;
  }

  if (loadError) {
    return <p className="message error">{loadError}</p>;
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Job search workspace</p>
          <h1>Applications</h1>
          <p className="application-count">
            {jobs.length} {jobs.length === 1 ? "application" : "applications"}{" "}
            tracked
          </p>
        </div>

        <button
          className="add-button"
          type="button"
          onClick={() => setIsFormOpen((current) => !current)}
        >
          {isFormOpen ? "Cancel" : "+ Add application"}
        </button>
      </header>

      {isFormOpen && (
        <form className="job-form" onSubmit={handleSubmit}>
          <h2>Add application</h2>

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

          {formError && <p className="form-error">{formError}</p>}

          <button
            className="submit-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Save application"}
          </button>
        </form>
      )}

      {jobs.length === 0 ? (
        <p className="message">No job applications yet.</p>
      ) : (
        <section className="jobs-grid">
          {jobs.map((job) => (
            <article className="job-card" key={job.id}>
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
                      handleStatusChange(job.id, event.target.value)
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
                    onClick={() => handleDelete(job.id)}
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
          ))}
        </section>
      )}
    </main>
  );
}

export default App;

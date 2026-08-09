import { apiFetch } from "../lib/api";


import {
    useState,
    type FormEvent,
  } from "react";
  import type { Job } from "../types/job";
  
  type ApplicationFormProps = {
    onCreated: (job: Job) => void;
  };
  
  const emptyForm = {
    company: "",
    title: "",
    location: "",
    jobUrl: "",
    notes: "",
  };
  
  export default function ApplicationForm({
    onCreated,
  }: ApplicationFormProps) {
    const [formData, setFormData] = useState(emptyForm);
    const [formError, setFormError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
  
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setFormError("");
      setIsSubmitting(true);
  
      try {
        const response = await apiFetch("/jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
  
        const result = await response.json();
  
        if (!response.ok) {
          throw new Error(
            result.error || "Unable to create application"
          );
        }
  
        onCreated(result);
        setFormData(emptyForm);
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  
    return (
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
    );
  }
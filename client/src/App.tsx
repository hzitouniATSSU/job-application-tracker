import { useEffect, useState } from "react";
import "./App.css";

import type {Job} from "./types/job";
import JobCard from "./components/JobCard";
import ApplicationForm from "./components/ApplicationForm";
import DocumentsPanel from "./components/DocumentsPanel";


function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFormOpen, setIsFormOpen]= useState(false);

  
  

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

  function handleJobCreated(createdJob: Job){
    setJobs((currentJobs)=> [createdJob, ...currentJobs]);
    setIsFormOpen(false);
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
        <ApplicationForm onCreated={handleJobCreated}/>
      )}

      {jobs.length === 0 ? (
        <p className="message">No job applications yet.</p>
      ) : (
        <section className="jobs-grid">
          {jobs.map((job) => (
            <JobCard
            key={job.id}
            job={job}
            onDelete={handleDelete}
            onStatusChange={handleStatusChange}
            />
          ))}
        </section>
      )}

    <DocumentsPanel jobs={jobs} />
    </main>
  );
}

export default App;

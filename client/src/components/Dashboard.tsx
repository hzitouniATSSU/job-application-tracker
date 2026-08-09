import { useEffect, useState } from "react";

import { apiFetch } from "../lib/api";

import type { User } from "../types/user";
import type { Job } from "../types/job";

import JobCard from "./JobCard";
import ApplicationForm from "./ApplicationForm";
import DocumentsPanel from "./DocumentsPanel";
import RemindersPanel from "./RemindersPanel";

type DashboardProps = {
  user: User;
  onLogout: () => void;
};

function Dashboard({ user, onLogout }: DashboardProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [searchQuery] = useState("");
  const [statusFilter] = useState("ALL");
  const [sortOrder] = useState("NEWEST");

  useEffect(() => {
    async function loadJobs() {
      try {
        const response = await apiFetch("/jobs");

        if (!response.ok) {
          throw new Error("Unable to retrieve jobs");
        }

        const data: Job[] = await response.json();

        setJobs(data);
      } catch (error) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Something went wrong"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, []);

  function handleJobCreated(createdJob: Job) {
    setJobs((currentJobs) => [
      createdJob,
      ...currentJobs,
    ]);

    setIsFormOpen(false);
  }

  function handleJobUpdated(updatedJob: Job) {
    setJobs((currentJobs) =>
      currentJobs.map((job) =>
        job.id === updatedJob.id
          ? updatedJob
          : job
      )
    );
  }

  async function handleDelete(jobId: number) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/jobs/${jobId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to delete application"
        );
      }

      setJobs((currentJobs) =>
        currentJobs.filter((job) => job.id !== jobId)
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  }

  async function handleStatusChange(
    jobId: number,
    status: string
  ) {
    try {
      const response = await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to update application"
        );
      }

      const updatedJob: Job = result;

      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId ? updatedJob : job
        )
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    }
  }

  const normalizedSearch =
    searchQuery.trim().toLowerCase();

  const filteredJobs = jobs
    .filter((job) => {
      const matchesSearch =
        normalizedSearch === "" ||
        job.company
          .toLowerCase()
          .includes(normalizedSearch) ||
        job.title
          .toLowerCase()
          .includes(normalizedSearch) ||
        (job.location || "")
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "ALL" ||
        job.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort((firstJob, secondJob) => {
      if (sortOrder === "OLDEST") {
        return (
          new Date(firstJob.appliedAt).getTime() -
          new Date(secondJob.appliedAt).getTime()
        );
      }

      if (sortOrder === "COMPANY") {
        return firstJob.company.localeCompare(
          secondJob.company
        );
      }

      return (
        new Date(secondJob.appliedAt).getTime() -
        new Date(firstJob.appliedAt).getTime()
      );
    });

  const applicationStats = [
    {
      label: "Total",
      value: jobs.length,
    },
    {
      label: "Interviews",
      value: jobs.filter(
        (job) => job.status === "INTERVIEW"
      ).length,
    },
    {
      label: "Offers",
      value: jobs.filter(
        (job) => job.status === "OFFER"
      ).length,
    },
    {
      label: "Rejected",
      value: jobs.filter(
        (job) => job.status === "REJECTED"
      ).length,
    },
  ];

  if (isLoading) {
    return (
      <p className="message">
        Loading applications...
      </p>
    );
  }

  if (loadError) {
    return (
      <p className="message error">
        {loadError}
      </p>
    );
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">
            Job search workspace
          </p>

          <h1>Applications</h1>

          <p className="application-count">
            {jobs.length}{" "}
            {jobs.length === 1
              ? "application"
              : "applications"}{" "}
            tracked
          </p>

          <p>Signed in as {user.email}</p>
        </div>

     <div className="header-actions">
  <button
    className="logout-button"
    type="button"
    onClick={onLogout}
  >
    Logout
  </button>

  <button
    className="add-button"
    type="button"
    onClick={() =>
      setIsFormOpen((current) => !current)
    }
  >
    {isFormOpen
      ? "Cancel"
      : "+ Add application"}
  </button>
</div>
      </header>

      <section
        className="stats-grid"
        aria-label="Application statistics"
      >
        {applicationStats.map((stat) => (
          <article
            className="stat-card"
            key={stat.label}
          >
            <p>{stat.label}</p>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      {isFormOpen && (
        <ApplicationForm
          onCreated={handleJobCreated}
        />
      )}

      {jobs.length === 0 ? (
        <p className="message">
          No job applications yet.
        </p>
      ) : filteredJobs.length === 0 ? (
        <p className="message">
          No application matches your filter.
        </p>
      ) : (
        <section className="jobs-grid">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              onUpdated={handleJobUpdated}
            />
          ))}
        </section>
      )}

      <DocumentsPanel jobs={jobs} />

      <RemindersPanel jobs={jobs} />
    </main>
  );
}

export default Dashboard;
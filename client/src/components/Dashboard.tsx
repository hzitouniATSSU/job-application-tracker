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
  const [activeView, setActiveView] = useState<
  "overview" | "applications" | "documents" | "reminders"
>("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("NEWEST");

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
  <div className="dashboard-layout">
    {/* SIDEBAR */}
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">JT</span>
        <span>JobTrack</span>
      </div>

      <nav
        className="sidebar-nav"
        aria-label="Dashboard navigation"
      >
        <button
          type="button"
          className={
            activeView === "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveView("overview")
          }
        >
          <span className="nav-icon">⌂</span>
          Overview
        </button>

        <button
          type="button"
          className={
            activeView === "applications"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveView("applications")
          }
        >
          <span className="nav-icon">▣</span>
          <span>Applications</span>
          {jobs.length > 0 && (
      <span className="nav-count">
        {jobs.length}
      </span>
    )}
        </button>

        <button
          type="button"
          className={
            activeView === "documents"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveView("documents")
          }
        >
          <span className="nav-icon">▤</span>
    <span>Documents</span>
          
        </button>

        <button
          type="button"
          className={
            activeView === "reminders"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveView("reminders")
          }
        >
          <span className="nav-icon">◷</span>
    <span>Reminders</span>
          
        </button>
      </nav>
    </aside>

    {/* RIGHT SIDE */}
    <div className="dashboard-main">
      {/* TOP BAR */}
      <header className="topbar">
        <p className="topbar-label">
          Job search workspace
        </p>

        <div className="topbar-user">
          <div className="user-avatar">
            {user.email.charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <span className="user-email">
              {user.email}
            </span>

            <span className="user-status">
               Signed in 
            </span>
          </div>
          

          <button
            className="logout-button"
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      {/* PAGE CONTENT */}
      <main className="dashboard-content">

        {/* =========================
            OVERVIEW
        ========================== */}

        {activeView === "overview" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  Dashboard
                </p>

                <h1>
                  Job search overview
                </h1>

                <p className="application-count">
                  {jobs.length}{" "}
                  {jobs.length === 1
                    ? "application"
                    : "applications"}{" "}
                  tracked
                </p>
              </div>

              <button
                className="add-button"
                type="button"
                onClick={() => {
                  setActiveView(
                    "applications"
                  );
                  setIsFormOpen(true);
                }}
              >
                + Add application
              </button>
            </header>

            <section
              className="stats-grid"
              aria-label="Application statistics"
            >
              {applicationStats.map(
                (stat) => (
                  <article
                    className="stat-card"
                    key={stat.label}
                  >
                    <p>{stat.label}</p>

                    <strong>
                      {stat.value}
                    </strong>
                  </article>
                )
              )}
            </section>

            <section className="overview-grid">
  <div className="overview-card">
    <div className="section-header">
      <div>
        <p className="eyebrow">
          Recent activity
        </p>

        <h2>
          Recent applications
        </h2>
      </div>

      <button
        type="button"
        className="text-button"
        onClick={() =>
          setActiveView("applications")
        }
      >
        View all
      </button>
    </div>

    {jobs.length === 0 ? (
      <div className="empty-state">
        <h3>No applications yet</h3>

        <p>
          Add your first job application to start
          tracking your search.
        </p>
      </div>
    ) : (
      <section className="jobs-grid">
        {jobs
          .slice(0, 3)
          .map((job) => (
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
  </div>
  <div className="overview-card">
    <div className="section-header">
      <div>
        <p className="eyebrow">
          Schedule
        </p>

        <h2>
          Upcoming reminders
        </h2>
      </div>
      <button
      type="button"
      className="text-button"
      onClick={()=>
      setActiveView("reminders")
      }
      >
        View all
      </button>
    </div>
    <div className="empty-state compact ">
      <h3>
        No upcoming reminders
      </h3>

      <p>
        Add a follow-up, interview,
        or application deadline.
      </p>
    </div>
  </div>
</section>
          </>
        )}

        {/* =========================
            APPLICATIONS
        ========================== */}

        {activeView ===
          "applications" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  Job search
                </p>

                <h1>Applications</h1>

                <p className="application-count">
                  {jobs.length}{" "}
                  {jobs.length === 1
                    ? "application"
                    : "applications"}{" "}
                  tracked
                </p>
              </div>

              <button
                className="add-button"
                type="button"
                onClick={() =>
                  setIsFormOpen(
                    (current) =>
                      !current
                  )
                }
              >
                {isFormOpen
                  ? "Cancel"
                  : "+ Add application"}
              </button>
            </header>

            <section
              className="stats-grid"
              aria-label="Application statistics"
            >
              {applicationStats.map(
                (stat) => (
                  <article
                    className="stat-card"
                    key={stat.label}
                  >
                    <p>{stat.label}</p>

                    <strong>
                      {stat.value}
                    </strong>
                  </article>
                )
              )}
            </section>

            {isFormOpen && (
              <ApplicationForm
                onCreated={
                  handleJobCreated
                }
              />
            )}

            <section className="applications-toolbar" aria-label="Filter applications">
              <label className="application-search">
                <span className="visually-hidden">Search applications</span>
                <span className="search-icon" aria-hidden="true">⌕</span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search company, role, or location"
                />
              </label>

              <div className="status-filters" aria-label="Filter by status">
                {["ALL", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED", "WITHDRAWN"].map(
                  (status) => (
                    <button
                      key={status}
                      type="button"
                      className={`filter-pill ${statusFilter === status ? "active" : ""}`}
                      aria-pressed={statusFilter === status}
                      onClick={() => setStatusFilter(status)}
                    >
                      {status === "ALL"
                        ? "All"
                        : status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                  )
                )}
              </div>

              <label className="sort-control">
                <span>Sort</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                >
                  <option value="NEWEST">Newest first</option>
                  <option value="OLDEST">Oldest first</option>
                  <option value="COMPANY">Company A–Z</option>
                </select>
              </label>
            </section>

            {(searchQuery || statusFilter !== "ALL") && (
              <p className="filter-results" aria-live="polite">
                Showing {filteredJobs.length} of {jobs.length} applications
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear filters
                </button>
              </p>
            )}

            {jobs.length === 0 ? (
              <div className="empty-state">
                <h3>
                  No applications yet
                </h3>

                <p>
                  Add your first application
                  to start tracking your job
                  search.
                </p>
              </div>
            ) : filteredJobs.length ===
              0 ? (
              <div className="empty-state">
                <h3>
                  No matching applications
                </h3>

                <p>
                  Try changing your search
                  or filters.
                </p>
              </div>
            ) : (
              <section className="jobs-grid">
                {filteredJobs.map(
                  (job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onDelete={
                        handleDelete
                      }
                      onStatusChange={
                        handleStatusChange
                      }
                      onUpdated={
                        handleJobUpdated
                      }
                    />
                  )
                )}
              </section>
            )}
          </>
        )}

        {/* =========================
            DOCUMENTS
        ========================== */}

        {activeView === "documents" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  Document library
                </p>

                <h1>Documents</h1>

                <p className="application-count">
                  Manage resumes, cover
                  letters, and application
                  documents.
                </p>
              </div>
            </header>

            <DocumentsPanel jobs={jobs} />
          </>
        )}

        {/* =========================
            REMINDERS
        ========================== */}

        {activeView === "reminders" && (
          <>
            <header className="page-header">
              <div>
                <p className="eyebrow">
                  Schedule
                </p>

                <h1>Reminders</h1>

                <p className="application-count">
                  Keep track of interviews,
                  deadlines and follow-ups.
                </p>
              </div>
            </header>

            <RemindersPanel jobs={jobs} />
          </>
        )}
      </main>
    </div>
  </div>
);
}

export default Dashboard;

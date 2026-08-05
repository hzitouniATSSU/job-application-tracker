import { useEffect, useState } from "react";
import type { Job } from "../types/job";
import type { Reminder, ReminderType } from "../types/reminder";
import { apiUrl } from "../lib/api";

type RemindersPanelProps = {
  jobs: Job[];
};

export default function RemindersPanel({ jobs }: RemindersPanelProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedJobId, setSelectedJobId] = useState(
    jobs[0]?.id.toString() ?? ""
  );
  const [type, setType] = useState<ReminderType>("FOLLOW_UP");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [activeReminderId, setActiveReminderId] = useState<number | null>(null);

  useEffect(() => {
    async function loadReminders() {
      try {
        const response = await fetch(apiUrl("/reminders"));

        if (!response.ok) {
          throw new Error("Unable to retrieve reminders");
        }

        const data: Reminder[] = await response.json();
        setReminders(data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadReminders();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError("");

    if (!selectedJobId || !title.trim() || !dueAt) {
      setSubmitError("Application, title, and due date are required.");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch(apiUrl("/reminders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: Number(selectedJobId),
          type,
          title: title.trim(),
          dueAt: new Date(dueAt).toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create reminder");
      }

      const createdReminder = data as Reminder;

      setReminders((currentReminders) =>
        [...currentReminders, createdReminder].sort(
          (first, second) =>
            new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime()
        )
      );

      setTitle("");
      setDueAt("");
      setType("FOLLOW_UP");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to create reminder"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleReminder(reminder: Reminder) {
    try {
      setActionError("");
      setActiveReminderId(reminder.id);

      const response = await fetch(apiUrl(`/reminders/${reminder.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: !reminder.completed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update reminder");
      }

      const updatedReminder = data as Reminder;

      setReminders((currentReminders) =>
        currentReminders.map((currentReminder) =>
          currentReminder.id === updatedReminder.id
            ? updatedReminder
            : currentReminder
        )
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update reminder"
      );
    } finally {
      setActiveReminderId(null);
    }
  }

  async function handleDeleteReminder(reminderId: number) {
    const confirmed = window.confirm("Delete this reminder permanently?");

    if (!confirmed) {
      return;
    }

    try {
      setActionError("");
      setActiveReminderId(reminderId);

      const response = await fetch(apiUrl(`/reminders/${reminderId}`), {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to delete reminder");
      }

      setReminders((currentReminders) =>
        currentReminders.filter((reminder) => reminder.id !== reminderId)
      );
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to delete reminder"
      );
    } finally {
      setActiveReminderId(null);
    }
  }

  if (isLoading) {
    return <p className="message">Loading reminders...</p>;
  }

  if (loadError) {
    return <p className="message error">{loadError}</p>;
  }

  return (
    <section className="reminders-panel">
      <form className="reminder-form" onSubmit={handleSubmit}>
        <label>
          <span>Application</span>
          <select
            value={selectedJobId}
            onChange={(event) => setSelectedJobId(event.target.value)}
            required
          >
            <option value="">Select an application</option>

            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.company} — {job.title}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Reminder type</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as ReminderType)}
          >
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="INTERVIEW">Interview</option>
            <option value="DEADLINE">Deadline</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          <span>Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Follow up with recruiter"
            required
          />
        </label>

        <label>
          <span>Due date and time</span>
          <input
            type="datetime-local"
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Add reminder"}
        </button>

        {submitError && <p className="message error">{submitError}</p>}
      </form>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Schedule</p>
          <h2>Reminders</h2>
        </div>

        <span>{reminders.length} total</span>
      </div>

      {reminders.length === 0 ? (
        <p className="message">No reminders scheduled yet.</p>
      ) : (
        <>
        {actionError && (
            <p className="message error">{actionError}</p>
        )}

        <ul className="reminder-list">
          {reminders.map((reminder) => {
            const isOverdue =
              !reminder.completed &&
              new Date(reminder.dueAt).getTime() < Date.now();

            const isActive = activeReminderId === reminder.id;

            return (
              <li
                key={reminder.id}
                className={[
                  "reminder-item",
                  reminder.completed ? "completed" : "",
                  isOverdue ? "overdue" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="reminder-content">
                  <div className="reminder-title-row">
                    <strong>{reminder.title}</strong>

                    <span className="reminder-type">
                      {reminder.type.replace("_", " ")}
                    </span>
                  </div>

                  <span>
                    {reminder.job.company} — {reminder.job.title}
                  </span>

                  <time dateTime={reminder.dueAt}>
                    {new Date(reminder.dueAt).toLocaleString()}
                  </time>

                  {isOverdue && <span className="overdue-label">Overdue</span>}
                </div>

                <div className="reminder-actions">
                  <button
                    type="button"
                    disabled={isActive}
                    onClick={() => handleToggleReminder(reminder)}
                  >
                    {reminder.completed ? "Reopen" : "Complete"}
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    disabled={isActive}
                    onClick={() => handleDeleteReminder(reminder.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        </>
      )}
    </section>
  );
}

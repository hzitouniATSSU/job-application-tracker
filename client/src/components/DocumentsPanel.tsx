import { useEffect, useState, type FormEvent } from "react";
import type { UploadedDocument } from "../types/document";
import type { Job } from "../types/job";

type DocumentsPanelProps = {
  jobs: Job[];
};

export default function DocumentsPanel({ jobs }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Record<number, string>>({});
  const [linkingDocumentId, setLinkingDocumentId] = useState<number | null>(
    null
  );

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents");

        if (!response.ok) {
          throw new Error("Unable to retrieve documents");
        }

        const data: UploadedDocument[] = await response.json();
        setDocuments(data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Something went wrong"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDocuments();
  }, []);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError("");

    if (!file) {
      setUploadError("Select a PDF, DOC, or DOCX file");
      return;
    }

    const form = event.currentTarget;
    const body = new FormData();

    body.append("file", file);

    if (name.trim()) {
      body.append("name", name.trim());
    }

    setIsUploading(true);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to upload document");
      }

      const createdDocument: UploadedDocument = {
        ...result,
        jobs: [],
      };

      setDocuments((current) => [createdDocument, ...current]);

      setName("");
      setFile(null);
      form.reset();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(documentId: number) {
    const confirmed = window.confirm("Delete this document permanently?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to delete document");
      }
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId)
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }

  async function handleAttach(documentId: number) {
    const jobId = Number(selectedJobs[documentId]);

    if (Number.isNaN(jobId)) {
      window.alert("Select an application first");
      return;
    }

    setLinkingDocumentId(documentId);

    try {
      const response = await fetch(
        `/api/documents/${documentId}/jobs/${jobId}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to attach document");
      }

      const updatedDocument: UploadedDocument = result;

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? updatedDocument : document
        )
      );

      setSelectedJobs((current) => ({
        ...current,
        [documentId]: "",
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong"
      );
    } finally {
      setLinkingDocumentId(null);
    }
  }

  async function handleDetach(documentId: number, jobId: number) {
    const confirmed = window.confirm(
      "Detach this document from the application?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/documents/${documentId}/jobs/${jobId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to detach document");
      }

      const updatedDocument: UploadedDocument = result;

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? updatedDocument : document
        )
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong"
      );
    }
  }
  return (
    <section className="documents-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Document library</p>
          <h2>Documents</h2>
        </div>

        <span>{documents.length} stored</span>
      </div>

      <form className="upload-form" onSubmit={handleUpload}>
        <label>
          Document name
          <input
            placeholder="Technical Support Resume"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label>
          File
          <input
            required
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        {uploadError && <p className="form-error">{uploadError}</p>}

        <button className="submit-button" type="submit" disabled={isUploading}>
          {isUploading ? "Uploading..." : "Upload document"}
        </button>
      </form>

      {isLoading && <p className="message">Loading documents...</p>}

      {loadError && <p className="message error">{loadError}</p>}

      {!isLoading && !loadError && documents.length === 0 && (
        <p className="message">No documents uploaded yet.</p>
      )}

      {!isLoading && !loadError && documents.length > 0 && (
        <div className="documents-list">
          {documents.map((document) => (
            <article className="document-row" key={document.id}>
              <div>
                <h3>{document.name}</h3>
                <p>{document.originalName}</p>
                {document.jobs.length > 0 && (
                  <div className="attached-jobs">
                    <span>Attached to:</span>
                    {document.jobs.map((job) => (
                      <span className="attached-jobs" key={job.id}>
                        {job.company} — {job.title}
                        <button
                          type="button"
                          onClick={() => handleDetach(document.id, job.id)}
                          aria-label={`Detach from ${job.company} ${job.title}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="document-linker">
                  <select
                    value={selectedJobs[document.id] || ""}
                    onChange={(event) =>
                      setSelectedJobs((current) => ({
                        ...current,
                        [document.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select application</option>

                    {jobs.map((job) => {
                      const isAttached = document.jobs.some(
                        (attachedJob) => attachedJob.id === job.id
                      );

                      return (
                        <option
                          key={job.id}
                          value={job.id}
                          disabled={isAttached}
                        >
                          {job.company} — {job.title}
                          {isAttached ? " (attached)" : ""}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={() => handleAttach(document.id)}
                    disabled={
                      !selectedJobs[document.id] ||
                      linkingDocumentId === document.id
                    }
                  >
                    {linkingDocumentId === document.id
                      ? "Attaching..."
                      : "Attach"}
                  </button>
                </div>
              </div>

              <div className="document-meta">
                <span>{(document.size / 1024).toFixed(1)} KB</span>

                <div className="document-actions">
                  <a
                    href={`/api${document.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                  <button
                    className="delete-button"
                    type="button"
                    onClick={() => handleDelete(document.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

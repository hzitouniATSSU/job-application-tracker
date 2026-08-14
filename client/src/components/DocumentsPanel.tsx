import { useEffect, useState, type FormEvent } from "react";
import type { UploadedDocument } from "../types/document";
import type { Job } from "../types/job";
import { apiFetch } from "../lib/api";

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
    null,
  );

  useEffect(() => {
    async function loadDocuments() {
      try {
        const response = await apiFetch("/documents");

        if (!response.ok) {
          throw new Error("Unable to retrieve documents");
        }

        const data: UploadedDocument[] = await response.json();
        setDocuments(data);
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Something went wrong",
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
      const response = await apiFetch("/documents", {
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
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(documentId: number, originalName: string) {
    try {
      const response = await apiFetch(`/documents/${documentId}/download`);

      if (!response.ok) {
        let message = "Unable to download document";

        try {
          const result = await response.json();
          message = result.error || message;
        } catch {
          // Response may not be JSON.
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = window.document.createElement("a");

      link.href = objectUrl;
      link.download = originalName;

      window.document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }

  async function handleDelete(documentId: number) {
    const confirmed = window.confirm("Delete this document permanently?");

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/documents/${documentId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to delete document");
      }
      setDocuments((current) =>
        current.filter((document) => document.id !== documentId),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong",
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
      const response = await apiFetch(
        `/documents/${documentId}/jobs/${jobId}`,
        {
          method: "POST",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to attach document");
      }

      const updatedDocument: UploadedDocument = result;

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? updatedDocument : document,
        ),
      );

      setSelectedJobs((current) => ({
        ...current,
        [documentId]: "",
      }));
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong",
      );
    } finally {
      setLinkingDocumentId(null);
    }
  }

  async function handleDetach(documentId: number, jobId: number) {
    const confirmed = window.confirm(
      "Detach this document from the application?",
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(
        `/documents/${documentId}/jobs/${jobId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to detach document");
      }

      const updatedDocument: UploadedDocument = result;

      setDocuments((current) =>
        current.map((document) =>
          document.id === documentId ? updatedDocument : document,
        ),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Something went wrong",
      );
    }
  }
  return (
    <section className="documents-panel">
      <div className="section-heading">
        

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
  <div className="document-main">
    <div className="document-icon">
      {document.originalName
        .split(".")
        .pop()
        ?.toUpperCase()}
    </div>

    <div className="document-info">
      <div className="document-title-row">
        <div>
          <h3>{document.name}</h3>

          <p>{document.originalName}</p>
        </div>

        <span className="document-size">
          {(document.size / 1024).toFixed(1)} KB
        </span>
      </div>

      {document.jobs.length > 0 && (
        <div className="document-attachments">
          <span className="attachment-label">
            Attached to
          </span>

          <div className="attachment-tags">
            {document.jobs.map((job) => (
              <div
                className="attachment-tag"
                key={job.id}
              >
                <span>
                  {job.company} — {job.title}
                </span>

                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() =>
                    handleDetach(document.id, job.id)
                  }
                  aria-label={`Detach from ${job.company} ${job.title}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
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
          <option value="">
            Select application
          </option>

          {jobs.map((job) => {
            const isAttached =
              document.jobs.some(
                (attachedJob) =>
                  attachedJob.id === job.id
              );

            return (
              <option
                key={job.id}
                value={job.id}
                disabled={isAttached}
              >
                {job.company} — {job.title}
                {isAttached
                  ? " (attached)"
                  : ""}
              </option>
            );
          })}
        </select>

        <button
          type="button"
          className="secondary-action-button"
          onClick={() =>
            handleAttach(document.id)
          }
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
  </div>

  <div className="document-actions">
    <button
      type="button"
      className="download-button"
      onClick={() =>
        handleDownload(
          document.id,
          document.originalName
        )
      }
    >
      Download
    </button>

    <button
      className="delete-button"
      type="button"
      onClick={() =>
        handleDelete(document.id)
      }
    >
      Delete
    </button>
  </div>
</article>
          ))}
        </div>
      )}
    </section>
  );
}

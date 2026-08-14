import { useEffect, useState } from "react";
import { apiFetch, apiUrl, clearCsrfToken } from "../lib/api";
import type { User } from "../types/user";

type SettingsPanelProps = {
  user: User;
  onUserUpdated: (user: User) => void;
  onAccountDeleted: () => void;
};

export default function SettingsPanel({
  user,
  onUserUpdated,
  onAccountDeleted,
}: SettingsPanelProps) {
  const [name, setName] = useState(user.name ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      if (photo) formData.append("photo", photo);

      const response = await apiFetch("/auth/profile", {
        method: "PATCH",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile");
      }

      onUserUpdated(data.user as User);
      setPhoto(null);
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update profile");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Delete your account and all applications, documents, and reminders? This cannot be undone."
    );
    if (!confirmed) return;

    setError("");
    setIsDeleting(true);
    try {
      const response = await apiFetch("/auth/account", { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Unable to delete account");
      }

      clearCsrfToken();
      onAccountDeleted();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account");
      setIsDeleting(false);
    }
  }

  const photoSource = previewUrl || (user.hasProfilePhoto
    ? `${apiUrl("/auth/profile/photo")}?v=${encodeURIComponent(user.updatedAt)}`
    : "");

  return (
    <section className="settings-stack">
      <form className="settings-card" onSubmit={handleSave}>
        <div>
          <p className="eyebrow">Profile</p>
          <h2>Personal information</h2>
          <p className="settings-description">Choose how you appear in your workspace.</p>
        </div>

        <div className="profile-photo-editor">
          <div className="user-avatar profile-avatar">
            {photoSource ? (
              <img src={photoSource} alt="Profile preview" />
            ) : (
              (name || user.email).charAt(0).toUpperCase()
            )}
          </div>
          <label className="photo-picker">
            <span>Profile picture</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => handlePhotoChange(event.target.files?.[0] ?? null)}
            />
            <small>JPEG, PNG, or WebP. Maximum 5 MB.</small>
          </label>
        </div>

        <label className="settings-field">
          <span>Display name</span>
          <input
            value={name}
            maxLength={80}
            placeholder="Your name"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="settings-field">
          <span>Email address</span>
          <input value={user.email} disabled />
        </label>

        {message && <p className="message success">{message}</p>}
        {error && <p className="message error">{error}</p>}

        <button className="primary-button settings-save" type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <section className="settings-card danger-zone">
        <div>
          <p className="eyebrow">Danger zone</p>
          <h2>Delete account</h2>
          <p className="settings-description">
            Permanently delete your account, applications, reminders, and uploaded documents.
          </p>
        </div>
        <button className="delete-account-button" type="button" onClick={handleDeleteAccount} disabled={isDeleting}>
          {isDeleting ? "Deleting..." : "Delete my account"}
        </button>
      </section>
    </section>
  );
}

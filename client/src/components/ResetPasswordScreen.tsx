import {
  useState,
  type FormEvent,
} from "react";

import { apiFetch } from "../lib/api";

type ResetPasswordScreenProps = {
  token: string;
  onComplete: () => void;
};

export default function ResetPasswordScreen({
  token,
  onComplete,
}: ResetPasswordScreenProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (
      password.length < 12 ||
      password.length > 128
    ) {
      setError(
        "Password must be between 12 and 128 characters"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch(
        "/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Unable to reset password"
        );
      }

      setMessage(data.message);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">
          Job search workspace
        </p>

        <h1>Choose a new password</h1>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>New password</span>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            <span>Confirm password</span>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={12}
              autoComplete="new-password"
              required
            />
          </label>

          {error && (
            <p className="message error">
              {error}
            </p>
          )}

          {message && (
            <p className="message">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Resetting..."
              : "Reset password"}
          </button>
        </form>

        {message && (
          <button
            type="button"
            className="text-button"
            onClick={onComplete}
          >
            Return to sign in
          </button>
        )}
      </section>
    </main>
  );
}
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

type VerifyEmailScreenProps = {
  token: string;
  onComplete: () => void;
};

export default function VerifyEmailScreen({
  token,
  onComplete,
}: VerifyEmailScreenProps) {
  const [status, setStatus] = useState<
    "verifying" | "success" | "error"
  >("verifying");

  const [message, setMessage] = useState(
    "Verifying your email..."
  );

  useEffect(() => {
    async function verifyEmail() {
      try {
        const response = await apiFetch(
          "/auth/verify-email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              token,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Unable to verify email"
          );
        }

        setStatus("success");
        setMessage(
          data.message ||
            "Email verified successfully."
        );
      } catch (error) {
        setStatus("error");

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify email"
        );
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">
          Job search workspace
        </p>

        <h1>
          {status === "verifying"
            ? "Verifying email"
            : status === "success"
            ? "Email verified"
            : "Verification failed"}
        </h1>

        <p
          className={
            status === "error"
              ? "message error"
              : "message"
          }
        >
          {message}
        </p>

        {status === "success" && (
          <button
            type="button"
            onClick={onComplete}
          >
            Continue to sign in
          </button>
        )}

        {status === "error" && (
          <button
            type="button"
            className="text-button"
            onClick={onComplete}
          >
            Back to sign in
          </button>
        )}
      </section>
    </main>
  );
}
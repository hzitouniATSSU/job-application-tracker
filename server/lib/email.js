import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is not configured");
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL =
  process.env.EMAIL_FROM || "Job Tracker <noreply@example.com>";

export async function sendPasswordResetEmail({ to, resetToken }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  const resetUrl = `${clientUrl}/reset-password?token=${encodeURIComponent(
    resetToken,
  )}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Reset your Job Tracker password",
    html: `
      <h1>Reset your password</h1>

      <p>
        We received a request to reset the password
        for your Job Tracker account.
      </p>

      <p>
        <a href="${resetUrl}">
          Reset your password
        </a>
      </p>

      <p>
        This link expires in 30 minutes.
      </p>

      <p>
        If you did not request this reset,
        you can ignore this email.
      </p>
    `,
  });

  if (error) {
    throw new Error(`Unable to send password reset email: ${error.message}`);
  }

  return data;
}

export async function sendVerificationEmail({ to, verificationToken }) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

  const verificationUrl = `${clientUrl}/verify-email?token=${encodeURIComponent(
    verificationToken,
  )}`;

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your Job Tracker email",
    html: `
      <h1>Verify your email</h1>

      <p>
        Thanks for creating a Job Tracker account.
      </p>

      <p>
        <a href="${verificationUrl}">
          Verify your email
        </a>
      </p>

      <p>
        This verification link expires in 24 hours.
      </p>

      <p>
        If you did not create this account,
        you can ignore this email.
      </p>
    `,
  });

  if (error) {
    throw new Error(`Unable to send verification email: ${error.message}`);
  }

  return data;
}

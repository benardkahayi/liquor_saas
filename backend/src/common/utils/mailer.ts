// Sends email through Brevo's HTTPS API. (Render's free plan blocks normal
// SMTP email ports, so an HTTPS API is the way that works there.)
//
// Needs, on the server:
//   BREVO_API_KEY      — from Brevo → Settings → SMTP & API → API Keys
//   MAIL_FROM_EMAIL    — a sender address you verified in Brevo
//   MAIL_FROM_NAME     — optional, e.g. "AB BusinessHub"
//
// Without BREVO_API_KEY, nothing is sent. On your own computer the email is
// printed in the backend terminal instead, so you can still test the flow.

export interface Email {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL);
}

export async function sendEmail(email: Email): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email not configured — would send]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    } else {
      console.warn("[email] BREVO_API_KEY / MAIL_FROM_EMAIL not set — email to a user was not sent.");
    }
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY as string,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.MAIL_FROM_EMAIL,
        name: process.env.MAIL_FROM_NAME || "AB BusinessHub",
      },
      to: [{ email: email.to, name: email.toName || email.to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Brevo refused the email (${res.status}): ${body.slice(0, 300)}`);
  }
}

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
    throw new EmailError(res.status, body.slice(0, 300));
  }
}

// Brevo's refusal, with a plain explanation of the usual fix.
export class EmailError extends Error {
  constructor(public status: number, public providerMessage: string) {
    super(`Brevo refused the email (${status}): ${providerMessage}`);
  }

  get advice(): string {
    const m = this.providerMessage.toLowerCase();
    if (/\bip address\b|authori[sz]ed_?ips|unrecognised ip|unrecognized ip/.test(m)) {
      return "Brevo is blocking the server's IP address. In Brevo go to Settings → Security → Authorised IPs and turn off blocking of unknown IP addresses (Render's IPs change).";
    }
    if (m.includes("sender")) {
      return "The sender address isn't verified. In Brevo go to Senders, Domains & Dedicated IPs → Senders, add MAIL_FROM_EMAIL and click the link Brevo emails you.";
    }
    if (m.includes("not yet activated") || m.includes("not activated") || m.includes("permission_denied")) {
      return "Your Brevo account can't send yet. Finish activating it (Brevo may ask for your details or approve the account), then try again.";
    }
    if (this.status === 401 || m.includes("key")) {
      return "The API key is wrong or deleted. Create a new one in Brevo → Settings → SMTP & API → API Keys and paste it into BREVO_API_KEY on Render.";
    }
    return "Check the message above, or Brevo → Transactional → Logs.";
  }
}

// What the platform admin sees on the email check.
export function emailSetup() {
  return {
    configured: isEmailConfigured(),
    hasApiKey: Boolean(process.env.BREVO_API_KEY),
    from: process.env.MAIL_FROM_EMAIL || null,
    fromName: process.env.MAIL_FROM_NAME || "AB BusinessHub",
    appUrl: process.env.APP_URL || null,
  };
}

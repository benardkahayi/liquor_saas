// Sends email through an HTTPS email API. (Render's free plan blocks normal
// SMTP email ports, so an HTTPS API is the way that works there.)
//
// Two services are supported. Set the variables for ONE of them on Render:
//
// EmailJS (sends from your own Gmail; no domain or SMS check needed):
//   EMAILJS_SERVICE_ID   — Email Services → your Gmail service → Service ID
//   EMAILJS_TEMPLATE_ID  — Email Templates → the template → Template ID
//   EMAILJS_PUBLIC_KEY   — Account → General → Public Key
//   EMAILJS_PRIVATE_KEY  — Account → General → Private Key
//   (and in Account → Security, allow "API calls from non-browser applications")
//
// Brevo:
//   BREVO_API_KEY, MAIL_FROM_EMAIL (a verified sender), MAIL_FROM_NAME
//
// With neither set, nothing is sent. On your own computer the email is
// printed in the backend terminal instead, so you can still test the flow.

export interface Email {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text: string;
}

type Provider = "emailjs" | "brevo";

function emailJsConfigured() {
  return Boolean(
    process.env.EMAILJS_SERVICE_ID &&
      process.env.EMAILJS_TEMPLATE_ID &&
      process.env.EMAILJS_PUBLIC_KEY &&
      process.env.EMAILJS_PRIVATE_KEY
  );
}

function provider(): Provider | null {
  if (emailJsConfigured()) return "emailjs";
  if (process.env.BREVO_API_KEY && process.env.MAIL_FROM_EMAIL) return "brevo";
  return null;
}

export function isEmailConfigured(): boolean {
  return provider() !== null;
}

export async function sendEmail(email: Email): Promise<void> {
  if (!isEmailConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email not configured — would send]\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n`);
    } else {
      console.warn("[email] No email service set up (EmailJS or Brevo) — email to a user was not sent.");
    }
    return;
  }

  if (provider() === "emailjs") {
    await sendWithEmailJs(email);
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
    throw new EmailError(res.status, body.slice(0, 300), "brevo");
  }
}

// EmailJS fills its template with these values. The template in the EmailJS
// dashboard must use: To = {{to_email}}, Subject = {{subject}},
// Content = {{{html_content}}} (three braces, so the HTML isn't escaped).
async function sendWithEmailJs(email: Email): Promise<void> {
  const url = process.env.EMAILJS_API_URL || "https://api.emailjs.com/api/v1.0/email/send";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      service_id: process.env.EMAILJS_SERVICE_ID,
      template_id: process.env.EMAILJS_TEMPLATE_ID,
      user_id: process.env.EMAILJS_PUBLIC_KEY,
      accessToken: process.env.EMAILJS_PRIVATE_KEY,
      template_params: {
        to_email: email.to,
        to_name: email.toName || email.to,
        subject: email.subject,
        html_content: email.html,
        text_content: email.text,
        from_name: process.env.MAIL_FROM_NAME || "AB BusinessHub",
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EmailError(res.status, body.slice(0, 300), "emailjs");
  }
}

// The email service's refusal, with a plain explanation of the usual fix.
export class EmailError extends Error {
  constructor(
    public status: number,
    public providerMessage: string,
    public service: Provider = "brevo"
  ) {
    super(`${service === "emailjs" ? "EmailJS" : "Brevo"} refused the email (${status}): ${providerMessage}`);
  }

  get serviceName(): string {
    return this.service === "emailjs" ? "EmailJS" : "Brevo";
  }

  get advice(): string {
    const m = this.providerMessage.toLowerCase();
    if (this.service === "emailjs") {
      if (m.includes("non-browser")) {
        return "In EmailJS go to Account → Security and turn on \"Allow EmailJS API for non-browser applications\", then try again.";
      }
      if (m.includes("public key") || m.includes("private key") || m.includes("access token") || m.includes("user id")) {
        return "A key is wrong. Copy the Public Key and Private Key again from EmailJS → Account → General into EMAILJS_PUBLIC_KEY and EMAILJS_PRIVATE_KEY on Render.";
      }
      if (m.includes("service")) {
        return "The service ID is wrong, or the Gmail connection was removed. Check EmailJS → Email Services and copy the Service ID into EMAILJS_SERVICE_ID.";
      }
      if (m.includes("template")) {
        return "The template ID is wrong. Check EmailJS → Email Templates and copy the Template ID into EMAILJS_TEMPLATE_ID.";
      }
      if (m.includes("recipient")) {
        return "The template's \"To Email\" field must be exactly {{to_email}}. Fix it in EmailJS → Email Templates → Settings.";
      }
      if (m.includes("limit") || this.status === 429) {
        return "The EmailJS monthly limit is used up (200 on the free plan). It resets next month, or upgrade the plan.";
      }
      if (m.includes("gmail") || m.includes("reconnect") || m.includes("invalid grant") || m.includes("insufficient")) {
        return "The Gmail connection expired. In EmailJS → Email Services, open the Gmail service, click Connect Account again and allow sending.";
      }
      return "Check the message above, or EmailJS → Email History.";
    }
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
// (Only which settings are present — never the keys themselves.)
export function emailSetup() {
  return {
    configured: isEmailConfigured(),
    service: provider(),
    emailjs: {
      serviceId: Boolean(process.env.EMAILJS_SERVICE_ID),
      templateId: Boolean(process.env.EMAILJS_TEMPLATE_ID),
      publicKey: Boolean(process.env.EMAILJS_PUBLIC_KEY),
      privateKey: Boolean(process.env.EMAILJS_PRIVATE_KEY),
    },
    hasApiKey: Boolean(process.env.BREVO_API_KEY),
    from: process.env.MAIL_FROM_EMAIL || null,
    fromName: process.env.MAIL_FROM_NAME || "AB BusinessHub",
    appUrl: process.env.APP_URL || null,
  };
}

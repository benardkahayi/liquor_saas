import { db } from "@/config/db";
import { sendEmail, isEmailConfigured } from "@/common/utils/mailer";

// Emails the platform admin when a new business registers, with the owner's
// phone and a WhatsApp link, so they can be called the same day.
//
// Goes to ADMIN_NOTIFY_EMAIL (one address, or several separated by commas)
// if set; otherwise to every active Super Admin account.

const INDUSTRY_LABEL: Record<string, string> = {
  restaurant: "Restaurant",
  liquor_store: "Liquor store / bar",
  retail: "Retail shop",
  pharmacy: "Pharmacy",
  salon: "Salon",
  fish: "Fish seller",
  other: "Other",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// +255712345678 -> 0712 345 678 (how people in Tanzania write it)
function displayPhone(p: string): string {
  if (/^\+255\d{9}$/.test(p)) return `0${p.slice(4, 7)} ${p.slice(7, 10)} ${p.slice(10)}`;
  return p;
}

async function recipients(): Promise<string[]> {
  const fromEnv = (process.env.ADMIN_NOTIFY_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (fromEnv.length) return fromEnv;
  const admins = await db.user.findMany({
    where: { isSuperAdmin: true, isActive: true },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

export interface NewBusiness {
  tenantId: string;
  businessName: string;
  industry: string | null;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

export function newBusinessEmail(b: NewBusiness, appUrl: string) {
  const type = INDUSTRY_LABEL[b.industry ?? ""] ?? b.industry ?? "—";
  const phone = displayPhone(b.ownerPhone);
  const wa = `https://wa.me/${b.ownerPhone.replace(/\D/g, "")}`;
  const adminLink = `${appUrl}/super-admin/tenants/${b.tenantId}`;
  const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Dar_es_Salaam", dateStyle: "medium", timeStyle: "short" });

  const subject = `New business: ${b.businessName}`;
  const text =
    `A new business has registered on AB BusinessHub.\n\n` +
    `Business: ${b.businessName} (${type})\nOwner: ${b.ownerName}\nPhone: ${phone}\nEmail: ${b.ownerEmail}\nRegistered: ${when}\n\n` +
    `WhatsApp: ${wa}\nSee it in Super Admin: ${adminLink}\n`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 0;color:#6b7772;width:110px">${label}</td><td style="padding:6px 0;font-weight:600">${value}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1c2421">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
    <tr><td style="font-size:20px;font-weight:bold;padding-bottom:4px">${escapeHtml(b.businessName)}</td></tr>
    <tr><td style="font-size:14px;color:#6b7772;padding-bottom:16px">New business registered · ${escapeHtml(when)}</td></tr>
    <tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">
      ${row("Type", escapeHtml(type))}
      ${row("Owner", escapeHtml(b.ownerName))}
      ${row("Phone", escapeHtml(phone))}
      ${row("Email", escapeHtml(b.ownerEmail))}
    </table></td></tr>
    <tr><td style="padding-top:20px">
      <a href="${wa}" style="display:inline-block;background:#0f6b47;color:#ffffff;text-decoration:none;font-weight:bold;padding:11px 18px;border-radius:8px;margin-right:8px">WhatsApp the owner</a>
      <a href="${adminLink}" style="display:inline-block;color:#0f6b47;text-decoration:none;font-weight:bold;padding:11px 4px">Open in Super Admin</a>
    </td></tr>
    <tr><td style="font-size:13px;color:#6b7772;padding-top:20px">Tip: a call on the first day is the best way to get a business using the app.</td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html };
}

export async function notifyNewBusiness(b: NewBusiness): Promise<void> {
  try {
    if (!isEmailConfigured()) {
      console.info(`[new business] ${b.businessName} registered (email not set up, no notice sent)`);
      return;
    }
    const appUrl = (process.env.APP_URL || `https://${process.env.APP_DOMAIN || "localhost"}`).replace(/\/+$/, "");
    const { subject, text, html } = newBusinessEmail(b, appUrl);
    for (const to of await recipients()) {
      await sendEmail({ to, subject, text, html });
    }
    console.info(`[new business] ${b.businessName}: admin notified`);
  } catch (err) {
    console.error("[new business] notice failed:", err);
  }
}

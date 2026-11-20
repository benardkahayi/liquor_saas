import crypto from "crypto";
import { db } from "@/config/db";
import { BadRequestError } from "@/common/errors/AppError";
import { hashPassword } from "@/common/utils/password";
import { sendEmail } from "@/common/utils/mailer";

const LINK_VALID_MINUTES = 60;
const MIN_SECONDS_BETWEEN_EMAILS = 60;
const MAX_EMAILS_PER_HOUR = 5;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Where the reset link points: the website's main address.
function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const domain = process.env.APP_DOMAIN || "localhost";
  return process.env.NODE_ENV === "production" ? `https://${domain}` : `http://${domain}:5173`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function resetEmail(name: string, link: string) {
  const first = escapeHtml(name.split(" ")[0] || "there");
  const subject = "Reset your password / Badilisha nenosiri lako";
  const text =
    `Hello ${name.split(" ")[0] || "there"},\n\n` +
    `Someone asked to reset the password for your AB BusinessHub account. ` +
    `Open this link to choose a new password (it works for ${LINK_VALID_MINUTES} minutes, once):\n\n${link}\n\n` +
    `If you didn't ask for this, ignore this email — your password stays the same.\n\n` +
    `---\nHabari, fungua kiungo hiki kuchagua nenosiri jipya (kinafanya kazi kwa dakika ${LINK_VALID_MINUTES}, mara moja tu). ` +
    `Kama hukuomba, puuza barua hii.\n`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#1c2421">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:28px">
    <tr><td style="font-size:20px;font-weight:bold;padding-bottom:12px">Reset your password</td></tr>
    <tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px">Hello ${first}, someone asked to reset the password for your AB BusinessHub account. Tap the button to choose a new one. The link works for ${LINK_VALID_MINUTES} minutes and only once.</td></tr>
    <tr><td style="padding-bottom:24px"><a href="${link}" style="display:inline-block;background:#0f6b47;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">Choose a new password</a></td></tr>
    <tr><td style="font-size:13px;line-height:1.6;color:#6b7772;padding-bottom:16px">If you didn't ask for this, ignore this email — your password stays the same.</td></tr>
    <tr><td style="font-size:13px;line-height:1.6;color:#6b7772;border-top:1px solid #e4eae6;padding-top:16px">Habari ${first}, bonyeza kitufe hapo juu kuchagua nenosiri jipya. Kiungo kinafanya kazi kwa dakika ${LINK_VALID_MINUTES}, mara moja tu. Kama hukuomba, puuza barua hii.</td></tr>
  </table></td></tr></table></body></html>`;
  return { subject, text, html };
}

// Always finishes the same way whether or not the email has an account, so
// the form can't be used to find out who is registered.
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim();
  const user = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) return;

  // Don't let the form be used to flood someone's inbox.
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.passwordResetToken.findMany({
    where: { userId: user.id, createdAt: { gte: hourAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (recent.length >= MAX_EMAILS_PER_HOUR) return;
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < MIN_SECONDS_BETWEEN_EMAILS * 1000) return;

  const token = crypto.randomBytes(32).toString("base64url");
  await db.$transaction([
    // Only the newest link works.
    db.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + LINK_VALID_MINUTES * 60 * 1000),
      },
    }),
  ]);

  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, text, html } = resetEmail(user.fullName, link);
  try {
    await sendEmail({ to: user.email, toName: user.fullName, subject, text, html });
  } catch (err) {
    // Logged for you to see in Render; the person still gets the normal
    // "check your email" answer.
    console.error("[password reset] email failed:", err);
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, isActive: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    throw new BadRequestError("This reset link is invalid or has expired. Ask for a new one.");
  }

  const passwordHash = await hashPassword(newPassword);
  const now = new Date();
  // Claim the link first; if two tabs submit at once, only one succeeds.
  const claimed = await db.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: now },
  });
  if (claimed.count !== 1) {
    throw new BadRequestError("This reset link has already been used. Ask for a new one.");
  }
  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: now },
    }),
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);
}

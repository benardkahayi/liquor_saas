import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { AuthLayout } from "../components/AuthLayout";
import { AuthInput } from "../components/AuthInput";

export function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      if ((err as { code?: string }).code === "ERR_NETWORK") {
        setError(t("login.error.network", "Cannot reach the server. Check your internet connection and try again."));
      } else {
        setError(extractErrorMessage(err, t("forgot.error", "Something went wrong. Try again.")));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="AB BusinessHub"
      title={t("forgot.title", "Forgot your password?")}
      subtitle={t("forgot.subtitle", "We'll email you a link to choose a new one")}
      footer={
        <Link to="/login" className="font-semibold text-[#0F6B47] hover:text-[#0B5639]">
          {t("forgot.backToLogin", "Back to sign in")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={36} className="text-[#0F6B47]" />
          <p className="text-base font-semibold text-[#12352B]">{t("forgot.sentTitle", "Check your email")}</p>
          <p className="text-sm text-[#4A5652]">
            {t(
              "forgot.sentBody",
              "If an account uses {email}, a link to reset the password is on its way. It works for one hour. Check your spam folder too."
            ).replace("{email}", email)}
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-2 text-sm font-semibold text-[#0F6B47] hover:text-[#0B5639]"
          >
            {t("forgot.tryAgain", "Use a different email")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorBanner message={error} />
          <AuthInput
            label={t("common.email", "Email")}
            type="email"
            required
            value={email}
            onChange={setEmail}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl bg-[#0F6B47] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0B5639] disabled:opacity-60"
          >
            {isSubmitting ? t("forgot.sending", "Sending…") : t("forgot.submit", "Send reset link")}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

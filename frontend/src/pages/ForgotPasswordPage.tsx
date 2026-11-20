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
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
          {t("forgot.backToLogin", "Back to sign in")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck size={36} className="text-blue-400" />
          <p className="text-sm font-semibold text-white">{t("forgot.sentTitle", "Check your email")}</p>
          <p className="text-sm text-slate-400">
            {t(
              "forgot.sentBody",
              "If an account uses {email}, a link to reset the password is on its way. It works for one hour. Check your spam folder too."
            ).replace("{email}", email)}
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-2 text-sm font-medium text-blue-400 hover:text-blue-300"
          >
            {t("forgot.tryAgain", "Use a different email")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorBanner variant="dark" message={error} />
          <AuthInput
            label={t("common.email", "Email")}
            type="email"
            required
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-100"
          >
            {isSubmitting ? t("forgot.sending", "Sending…") : t("forgot.submit", "Send reset link")}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { AuthLayout } from "../components/AuthLayout";
import { AuthInput } from "../components/AuthInput";

export function ResetPasswordPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError(t("reset.error.short", "Password must be at least 8 characters"));
      return;
    }
    if (password !== confirm) {
      setError(t("reset.error.mismatch", "The two passwords don't match"));
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(
        extractErrorMessage(err, t("reset.error.invalid", "This reset link is invalid or has expired. Ask for a new one."))
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const missingToken = token.length < 20;

  return (
    <AuthLayout
      eyebrow="AB BusinessHub"
      title={t("reset.title", "Choose a new password")}
      subtitle={t("reset.subtitle", "You'll use it the next time you sign in")}
      footer={
        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
          {t("forgot.backToLogin", "Back to sign in")}
        </Link>
      }
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 size={36} className="text-emerald-400" />
          <p className="text-sm font-semibold text-white">{t("reset.doneTitle", "Password changed")}</p>
          <p className="text-sm text-slate-400">
            {t("reset.doneBody", "For your safety, you've been signed out on other phones and computers.")}
          </p>
          <Link
            to="/login"
            className="mt-2 w-full rounded-xl bg-blue-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500"
          >
            {t("reset.signIn", "Sign in")}
          </Link>
        </div>
      ) : missingToken ? (
        <div className="flex flex-col gap-4 text-center">
          <p className="text-sm text-slate-300">
            {t("reset.noToken", "This reset link is incomplete. Open the link from your email again, or ask for a new one.")}
          </p>
          <Link
            to="/forgot-password"
            className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {t("reset.askAgain", "Ask for a new link")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ErrorBanner variant="dark" message={error} />
          <AuthInput
            label={t("reset.new", "New password")}
            isPassword
            required
            minLength={8}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
          />
          <AuthInput
            label={t("reset.confirm", "Type it again")}
            isPassword
            required
            minLength={8}
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
          />
          <p className="-mt-2 text-xs text-slate-500">{t("reset.hint", "At least 8 characters")}</p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-1 w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-100"
          >
            {isSubmitting ? t("reset.saving", "Saving…") : t("reset.submit", "Save new password")}
          </button>
          {error && (
            <Link to="/forgot-password" className="text-center text-sm font-medium text-blue-400 hover:text-blue-300">
              {t("reset.askAgain", "Ask for a new link")}
            </Link>
          )}
        </form>
      )}
    </AuthLayout>
  );
}

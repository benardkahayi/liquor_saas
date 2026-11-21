import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { AuthLayout } from "../components/AuthLayout";
import { AuthInput } from "../components/AuthInput";
import { getCurrentSubdomain, goToTenant, goToBase } from "../lib/tenantHost";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { user, tenantSlug } = await login(email, password);
      const currentSubdomain = getCurrentSubdomain();

      if (user.isSuperAdmin) {
        // Super admin only lives on the base domain.
        currentSubdomain ? goToBase("/super-admin/dashboard") : navigate("/super-admin/dashboard");
        return;
      }

      if (!tenantSlug) {
        setError(t("login.error.invalid", "Invalid email or password"));
        return;
      }

      if (currentSubdomain && currentSubdomain !== tenantSlug) {
        // Logged in fine, but this account belongs to a different business
        // than the one whose subdomain we're currently on.
        setError(
          t("login.error.wrongBusiness", "This account doesn't have access to this business.")
        );
        return;
      }

      currentSubdomain ? navigate("/dashboard") : goToTenant(tenantSlug, "/dashboard");
    } catch (err) {
      if ((err as { code?: string }).code === "ERR_NETWORK") {
        setError(
          t(
            "login.error.network",
            "Cannot reach the server. Check your internet connection and try again."
          )
        );
      } else {
        setError(extractErrorMessage(err, t("login.error.invalid", "Invalid email or password")));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="AB BusinessHub"
      title={t("login.title", "Welcome back")}
      subtitle={t("login.subtitle", "Sign in to your account")}
      footer={
        <>
          {t("login.noAccount", "Don't have an account?")}{" "}
          <Link to="/register" className="font-semibold text-[#0F6B47] hover:text-[#0B5639]">
            {t("login.createOne", "Create one")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />

        <AuthInput
          label={t("common.email", "Email")}
          type="email"
          required
          value={email}
          onChange={setEmail}
        />
        <AuthInput
          label={t("common.password", "Password")}
          isPassword
          required
          value={password}
          onChange={setPassword}
        />
        <Link
          to="/forgot-password"
          className="-mt-1 self-end text-sm font-semibold text-[#0F6B47] hover:text-[#0B5639]"
        >
          {t("login.forgot", "Forgot password?")}
        </Link>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full rounded-xl bg-[#0F6B47] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0B5639] disabled:opacity-60"
        >
          {isSubmitting ? t("login.submitting", "Signing in…") : t("login.submit", "Sign In")}
        </button>
      </form>
    </AuthLayout>
  );
}

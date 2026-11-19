import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../components/ErrorBanner";
import { AuthLayout } from "../components/AuthLayout";
import { AuthInput } from "../components/AuthInput";
import { goToTenant } from "../lib/tenantHost";
import { BUSINESS_TYPES } from "../lib/businessTypes";

export function RegisterPage() {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<string>("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!industry) {
      setError(t("register.error.type", "Choose what kind of business you run"));
      return;
    }

    if (ownerPassword !== confirmPassword) {
      setError(t("register.error.passwordMismatch", "Passwords do not match"));
      return;
    }

    setIsSubmitting(true);
    try {
      const { tenantSlug } = await register({ businessName, ownerFullName, ownerEmail, ownerPassword, industry });
      if (tenantSlug) {
        goToTenant(tenantSlug, "/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      if ((err as { code?: string }).code === "ERR_NETWORK") {
        setError(
          t(
            "login.error.network",
            "Cannot reach the server. Check your internet connection and try again."
          )
        );
      } else {
        setError(extractErrorMessage(err, t("register.error.generic", "Could not create your account")));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="AB BusinessHub"
      title={t("register.title", "Create your account")}
      subtitle={t("register.subtitle", "Set up a new business in minutes")}
      footer={
        <>
          {t("register.haveAccount", "Already have an account?")}{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">
            {t("register.signIn", "Sign in")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner variant="dark" message={error} />

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            {t("register.businessType", "What kind of business?")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_TYPES.map((bt) => (
              <button
                key={bt.value}
                type="button"
                onClick={() => setIndustry(bt.value)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  industry === bt.value
                    ? "border-blue-500 bg-blue-500/15 text-white"
                    : "border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-500"
                }`}
              >
                {t(bt.labelKey, bt.label)}
              </button>
            ))}
          </div>
        </div>

        <AuthInput
          label={t("register.businessName", "Business Name")}
          required
          minLength={2}
          value={businessName}
          onChange={setBusinessName}
          placeholder={industry === "restaurant" ? "Mama Ntilie Restaurant" : "Joe's Liquor Store"}
        />
        <AuthInput
          label={t("register.fullName", "Your Full Name")}
          required
          minLength={2}
          value={ownerFullName}
          onChange={setOwnerFullName}
          placeholder="Jane Doe"
        />
        <AuthInput
          label={t("common.email", "Email")}
          type="email"
          required
          value={ownerEmail}
          onChange={setOwnerEmail}
          placeholder="you@example.com"
        />

        <div>
          <AuthInput
            label={t("common.password", "Password")}
            isPassword
            required
            minLength={8}
            value={ownerPassword}
            onChange={setOwnerPassword}
            placeholder="••••••••"
          />
          <p className="text-xs text-slate-500 mt-1">{t("register.passwordHint", "At least 8 characters")}</p>
        </div>

        <AuthInput
          label={t("register.confirmPassword", "Confirm Password")}
          isPassword
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-100"
        >
          {isSubmitting
            ? t("register.submitting", "Creating account…")
            : t("register.submit", "Create Account")}
        </button>
      </form>
    </AuthLayout>
  );
}

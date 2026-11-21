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
          <Link to="/login" className="font-semibold text-[#0F6B47] hover:text-[#0B5639]">
            {t("register.signIn", "Sign in")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBanner message={error} />

        <div>
          <p className="mb-2 text-sm font-medium text-[#3B4642]">
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
                    ? "border-[#0F6B47] bg-[#EDF6F1] font-semibold text-[#12352B]"
                    : "border-[#D5DDD8] bg-white text-[#3B4642] hover:border-[#9CC4AE]"
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
        />
        <AuthInput
          label={t("register.fullName", "Your Full Name")}
          required
          minLength={2}
          value={ownerFullName}
          onChange={setOwnerFullName}
        />
        <AuthInput
          label={t("common.email", "Email")}
          type="email"
          required
          value={ownerEmail}
          onChange={setOwnerEmail}
        />

        <div>
          <AuthInput
            label={t("common.password", "Password")}
            isPassword
            required
            minLength={8}
            value={ownerPassword}
            onChange={setOwnerPassword}
          />
          <p className="mt-1 text-xs text-[#6B7772]">{t("register.passwordHint", "At least 8 characters")}</p>
        </div>

        <AuthInput
          label={t("register.confirmPassword", "Confirm Password")}
          isPassword
          required
          value={confirmPassword}
          onChange={setConfirmPassword}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full rounded-xl bg-[#0F6B47] py-3 text-[15px] font-semibold text-white transition-colors hover:bg-[#0B5639] disabled:opacity-60"
        >
          {isSubmitting
            ? t("register.submitting", "Creating account…")
            : t("register.submit", "Create Account")}
        </button>
      </form>
    </AuthLayout>
  );
}

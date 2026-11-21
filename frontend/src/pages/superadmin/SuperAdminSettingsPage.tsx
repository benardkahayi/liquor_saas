import { useEffect, useState } from "react";
import { Mail, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../../api/client";
import { useLanguage } from "../../context/LanguageContext";
import { ErrorBanner, extractErrorMessage } from "../../components/ErrorBanner";

interface EmailSetup {
  configured: boolean;
  hasApiKey: boolean;
  from: string | null;
  fromName: string;
  appUrl: string | null;
}

interface TestResult extends EmailSetup {
  ok: boolean;
  to: string;
  problem?: string;
  advice?: string;
}

// Platform settings. For now: check that the server can send email
// (password reset links depend on it).
export function SuperAdminSettingsPage() {
  const { t } = useLanguage();
  const [setup, setSetup] = useState<EmailSetup | null>(null);
  const [result, setResult] = useState<TestResult | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/superadmin/email")
      .then((res) => setSetup(res.data.data))
      .catch((err) => setError(extractErrorMessage(err, t("superadmin.email.loadError", "Could not load email settings"))));
  }, [t]);

  async function sendTest() {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await api.post("/superadmin/email/test");
      setResult(res.data.data);
    } catch (err) {
      setError(extractErrorMessage(err, t("superadmin.email.testError", "Could not run the email test")));
    } finally {
      setSending(false);
    }
  }

  const Row = ({ label, value, bad }: { label: string; value: string; bad?: boolean }) => (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className={`text-sm font-medium ${bad ? "text-red-600" : "text-gray-900"}`}>{value}</dd>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("superadmin.settings.title", "Settings")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("superadmin.settings.subtitle", "Platform setup checks.")}</p>
      </div>

      <ErrorBanner message={error} />

      <section className="card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Mail size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-900">{t("superadmin.email.title", "Email")}</h2>
        </div>
        <p className="mb-4 text-sm text-gray-600">
          {t(
            "superadmin.email.intro",
            "Password reset links are sent by email through Brevo. Send yourself a test to check it works."
          )}
        </p>

        {setup && (
          <dl className="mb-4 divide-y divide-gray-100 border-y border-gray-100">
            <Row
              label={t("superadmin.email.key", "Brevo API key (BREVO_API_KEY)")}
              value={setup.hasApiKey ? t("superadmin.email.set", "Set") : t("superadmin.email.missing", "Missing")}
              bad={!setup.hasApiKey}
            />
            <Row
              label={t("superadmin.email.from", "Sender (MAIL_FROM_EMAIL)")}
              value={setup.from ?? t("superadmin.email.missing", "Missing")}
              bad={!setup.from}
            />
            <Row
              label={t("superadmin.email.link", "Reset links open (APP_URL)")}
              value={setup.appUrl ?? t("superadmin.email.missing", "Missing")}
              bad={!setup.appUrl}
            />
          </dl>
        )}

        <button type="button" onClick={sendTest} disabled={sending} className="btn-primary px-4 py-2 text-sm">
          {sending ? t("superadmin.email.sending", "Sending…") : t("superadmin.email.test", "Send test email to me")}
        </button>

        {result && result.ok && (
          <div className="mt-4 flex gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>
              {t("superadmin.email.sent", "Brevo accepted the email to {e}. Check that inbox (and Spam). If it arrives, password reset emails work.").replace(
                "{e}",
                result.to
              )}
            </p>
          </div>
        )}
        {result && !result.ok && (
          <div className="mt-4 flex gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="font-semibold">{result.problem}</p>
              <p>{result.advice}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default SuperAdminSettingsPage;

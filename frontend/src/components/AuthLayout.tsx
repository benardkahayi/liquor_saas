import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";
import { buildBaseOrigin } from "../lib/tenantHost";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

// Sign-in, register and password pages. Same colours and fonts as the home
// page (LandingPage.tsx), so moving between them feels like one product.
export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  const { t } = useLanguage();
  // The home page lives on the main address (not on a business subdomain).
  const home = `${buildBaseOrigin()}/`;

  return (
    <div className="home min-h-screen bg-[#F4F8F5] text-[#1C2421]">
      <header className="border-b border-[#E4EAE6] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-3">
          <a href={home} className="flex items-center gap-2.5" aria-label="AB BusinessHub home">
            <span className="home-display flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F6B47] text-sm font-extrabold text-white">
              AB
            </span>
            <span className="home-display hidden text-lg font-bold sm:inline">AB BusinessHub</span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href={home}
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-[#4A5652] hover:bg-[#EDF6F1] hover:text-[#0F6B47]"
            >
              <ArrowLeft size={16} />
              {t("auth.backHome", "Back to home")}
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="flex justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="home-display text-[1.75rem] font-bold leading-tight text-[#12352B]">{title}</h1>
            <p className="mt-1.5 text-[15px] text-[#4A5652]">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-[#DDE5E0] bg-white p-6 shadow-[0_12px_30px_-18px_rgba(18,53,43,0.35)]">
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-[#6B7772]">{footer}</p>
        </div>
      </main>
    </div>
  );
}

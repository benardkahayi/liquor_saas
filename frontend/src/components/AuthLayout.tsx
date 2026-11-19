import type { ReactNode } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ eyebrow, title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 relative overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.25), transparent 45%), radial-gradient(circle at 80% 70%, rgba(245,158,11,0.15), transparent 45%), linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        }}
      />

      <div className="w-full max-w-sm relative">
        <div className="flex justify-center mb-4">
          <LanguageSwitcher dark />
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/30 mb-3">
            LS
          </div>
          <p className="text-blue-400 text-xs font-semibold tracking-widest uppercase">
            {eyebrow}
          </p>
          <h1 className="text-white text-2xl font-bold mt-2">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {children}
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">{footer}</p>
      </div>
    </div>
  );
}

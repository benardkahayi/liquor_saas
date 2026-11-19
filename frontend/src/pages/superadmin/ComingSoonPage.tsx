import type { ComponentType } from "react";
import { useLanguage } from "../../context/LanguageContext";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
}

export function ComingSoonPage({ title, description, icon: Icon }: ComingSoonPageProps) {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{title}</h1>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <span className="bg-gray-100 text-gray-400 rounded-full p-3 mb-4">
          <Icon size={24} />
        </span>
        <p className="text-gray-900 font-medium">{t("superadmin.comingSoon", "Coming soon")}</p>
        <p className="text-gray-500 text-sm mt-1 max-w-sm">{description}</p>
      </div>
    </div>
  );
}

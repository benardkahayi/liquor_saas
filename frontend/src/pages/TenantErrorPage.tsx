import type { ComponentType } from "react";
import { goToBase } from "../lib/tenantHost";

interface TenantErrorPageProps {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  message: string;
}

export function TenantErrorPage({ icon: Icon, title, message }: TenantErrorPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm card p-8 text-center">
        <span className="inline-flex bg-gray-100 text-gray-400 rounded-full p-3 mb-4">
          <Icon size={24} />
        </span>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <button
          onClick={() => goToBase("/")}
          className="btn-primary w-full mt-6 py-2 text-sm"
        >
          Go to homepage
        </button>
      </div>
    </div>
  );
}

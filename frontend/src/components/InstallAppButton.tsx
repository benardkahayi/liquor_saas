import { useState } from "react";
import { Download, Share, PlusSquare } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useInstall } from "../lib/pwa";
import { Modal } from "./Modal";

interface Props {
  // "menu": full-width button for the app's side menu.
  // "home": the green button style of the home and sign-in pages.
  // "link": small text link.
  variant?: "menu" | "home" | "link";
  className?: string;
}

// "Install app" — only shown where installing is possible and the app isn't
// already installed.
export function InstallAppButton({ variant = "menu", className = "" }: Props) {
  const { t } = useLanguage();
  const { mode, install } = useInstall();
  const [showIos, setShowIos] = useState(false);

  if (!mode) return null;

  const label = t("pwa.install", "Install app");
  const onClick = () => (mode === "prompt" ? void install() : setShowIos(true));

  const styles = {
    menu: "install-btn flex w-full items-center justify-center gap-2 rounded-lg border border-[#0F6B47]/30 bg-[#EDF6F1] px-3 py-2 text-sm font-medium text-[#0F6B47] hover:bg-[#E0F0E7]",
    home: "home-btn text-center",
    link: "inline-flex items-center gap-1.5 text-sm font-medium text-[#0F6B47] hover:underline",
  }[variant];

  return (
    <>
      <button type="button" onClick={onClick} className={`${styles} ${className}`}>
        <span className="inline-flex items-center justify-center gap-2">
          <Download size={16} aria-hidden />
          {label}
        </span>
      </button>

      {showIos && (
        <Modal title={t("pwa.iosTitle", "Add to your iPhone")} onClose={() => setShowIos(false)}>
          <ol className="space-y-4 text-sm text-gray-700">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF6F1] font-semibold text-[#0F6B47]">1</span>
              <span>
                {t("pwa.ios1", "Open this page in Safari, then tap the Share button")}{" "}
                <Share size={16} className="inline align-text-bottom text-[#0F6B47]" aria-label="Share" />
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF6F1] font-semibold text-[#0F6B47]">2</span>
              <span>
                {t("pwa.ios2", "Scroll down and tap “Add to Home Screen”")}{" "}
                <PlusSquare size={16} className="inline align-text-bottom text-[#0F6B47]" aria-hidden />
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDF6F1] font-semibold text-[#0F6B47]">3</span>
              <span>{t("pwa.ios3", "Tap “Add”. AB BusinessHub now opens from your home screen like an app.")}</span>
            </li>
          </ol>
        </Modal>
      )}
    </>
  );
}

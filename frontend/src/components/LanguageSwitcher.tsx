import { useLanguage } from "../context/LanguageContext";

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage } = useLanguage();

  const base = "px-2 py-1 text-xs font-medium rounded-md transition-colors";
  const activeClass = dark ? "bg-white/10 text-white" : "bg-white text-gray-900 shadow-sm";
  const inactiveClass = dark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700";

  return (
    <div className={`flex gap-0.5 rounded-lg p-0.5 ${dark ? "bg-white/5" : "bg-gray-100"}`}>
      <button
        onClick={() => setLanguage("en")}
        className={`${base} ${language === "en" ? activeClass : inactiveClass}`}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage("sw")}
        className={`${base} ${language === "sw" ? activeClass : inactiveClass}`}
      >
        SW
      </button>
    </div>
  );
}

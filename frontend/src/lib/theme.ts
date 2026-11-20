import { useEffect, useState } from "react";

// "system" follows the phone or computer's own light/dark setting. Many
// Android phones switch to dark when battery saver turns on, so "system"
// goes dark with them. (Websites can't read battery saver itself.)
export type ThemeChoice = "system" | "light" | "dark";

const KEY = "abh-theme";
const QUERY = "(prefers-color-scheme: dark)";

function readChoice(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    // storage blocked (private mode etc.) — fall back to following the device
  }
  return "system";
}

function systemIsDark(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.(QUERY).matches;
}

export function useTheme() {
  const [choice, setChoiceState] = useState<ThemeChoice>(readChoice);
  const [systemDark, setSystemDark] = useState<boolean>(systemIsDark);

  // Follow the device when it switches (e.g. battery saver, sunset schedule).
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  function setChoice(next: ThemeChoice) {
    setChoiceState(next);
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // not saved, but still applied for this visit
    }
  }

  const isDark = choice === "dark" || (choice === "system" && systemDark);
  return { choice, setChoice, isDark };
}

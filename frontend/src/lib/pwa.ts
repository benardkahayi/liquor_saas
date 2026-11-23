import { useEffect, useState } from "react";

// Installing the website as an app on the phone or computer.
//
// Chrome / Edge / Samsung Internet (Android, Windows) fire
// "beforeinstallprompt": we keep it and show our own "Install app" button.
// iPhone Safari has no such event: people add it from the Share menu, so we
// show them how instead.

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

export function isInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iPhone home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIos(): boolean {
  const ua = navigator.userAgent;
  const iPadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || iPadOs;
}

// Called once at startup (main.tsx).
export function setUpPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of the browser's banner
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });

  // Only on the live site: on your computer the service worker would keep
  // serving old files while you develop.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* the site still works without it */
      });
    });
  }
}

export type InstallMode = "prompt" | "ios" | null;

// What the install button should do here: show the browser's install
// dialog, show iPhone instructions, or not appear at all.
export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener?.("change", fn);
    return () => {
      listeners.delete(fn);
      mq?.removeEventListener?.("change", fn);
    };
  }, []);

  const mode: InstallMode = isInstalled() ? null : deferred ? "prompt" : isIos() ? "ios" : null;

  async function install(): Promise<boolean> {
    if (!deferred) return false;
    const e = deferred;
    await e.prompt();
    const { outcome } = await e.userChoice;
    deferred = null;
    notify();
    return outcome === "accepted";
  }

  return { mode, install };
}

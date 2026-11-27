import { AxiosError } from "axios";

// The server's reason, in words a person can act on. For a refused form it
// names what to fix ("Enter a valid phone number, e.g. 0712 345 678")
// instead of the bare "Invalid input".
export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const axiosErr = err as AxiosError<{
    error?: { message?: string; details?: { path?: string; message?: string }[] };
  }>;
  const e = axiosErr?.response?.data?.error;
  const details = (e?.details ?? []).map((d) => d.message).filter((m): m is string => !!m);
  if (details.length && (!e?.message || e.message === "Invalid input")) {
    return [...new Set(details)].join(" · ");
  }
  return e?.message ?? fallback;
}

export function ErrorBanner({
  message,
  variant = "light",
}: {
  message: string | null;
  variant?: "light" | "dark";
}) {
  if (!message) return null;

  if (variant === "dark") {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg px-3 py-2">
        {message}
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-2 mb-4">
      {message}
    </div>
  );
}

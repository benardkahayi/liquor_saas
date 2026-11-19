import { AxiosError } from "axios";

export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
  return axiosErr?.response?.data?.error?.message ?? fallback;
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

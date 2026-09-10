import { AxiosError } from "axios";

export function extractErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  const axiosErr = err as AxiosError<{ error?: { message?: string } }>;
  return axiosErr?.response?.data?.error?.message ?? fallback;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-2 mb-4">
      {message}
    </div>
  );
}

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  minLength?: number;
  isPassword?: boolean;
  autoComplete?: string;
}

export function AuthInput({
  label,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  isPassword,
  autoComplete,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[#3B4642]">{label}</span>
      <span className="relative block">
        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`w-full rounded-lg border border-[#CBD6D0] bg-white px-3 py-2.5 text-[15px] text-[#1C2421] transition focus:border-[#0F6B47] focus:outline-none focus:ring-2 focus:ring-[#0F6B47]/20 ${
            isPassword ? "pr-10" : ""
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7772] hover:text-[#1C2421]"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </span>
    </label>
  );
}

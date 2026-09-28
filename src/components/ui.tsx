import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-std)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-white text-brand border-2 border-brand hover:bg-brand-soft",
  ghost: "text-brand hover:bg-brand-soft",
  danger: "bg-danger text-white hover:bg-red-800",
};
const sizes: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  lg: "min-h-14 px-6 text-lg",
  xl: "min-h-20 px-8 text-2xl",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "md", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"div">) {
  return <div className={`rounded-[var(--radius-card)] bg-white border border-line p-4 sm:p-6 ${className}`} {...props} />;
}

export function Field({
  label,
  htmlFor,
  help,
  error,
  children,
}: {
  label: React.ReactNode;
  htmlFor: string;
  help?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : help ? (
        <p id={`${htmlFor}-help`} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "w-full rounded-[var(--radius-std)] border border-field bg-white px-3 text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-danger";
export const inputClass = `${inputBase} min-h-12 text-base`;
/** Touch-kiosk size. */
export const inputClassBig = `${inputBase} min-h-16 text-2xl`;

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function Alert({ tone = "info", children, className = "" }: { tone?: "info" | "success" | "warning" | "danger"; children: React.ReactNode; className?: string }) {
  const tones = {
    info: "bg-info-soft text-info border-info/30",
    success: "bg-success-soft text-success border-success/30",
    warning: "bg-warning-soft text-warning border-warning/30",
    danger: "bg-danger-soft text-danger border-danger/30",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`rounded-[var(--radius-std)] border px-4 py-3 font-medium ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

/** Big monospace code (tracking number, PIN) that is easy to read aloud. */
export function Code({ value, size = "lg", label }: { value: string; size?: "md" | "lg" | "xl"; label?: string }) {
  const sizes = { md: "text-xl", lg: "text-3xl", xl: "text-5xl" };
  const grouped = value.length === 10 ? `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}` : value.length === 6 ? `${value.slice(0, 3)} ${value.slice(3)}` : value;
  return (
    <span aria-label={label ? `${label}: ${value.split("").join(" ")}` : undefined} className={`font-mono font-bold tracking-widest text-ink ${sizes[size]}`}>
      {grouped}
    </span>
  );
}

"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { Check, Info, X } from "lucide-react";
import { cn } from "@/lib/util";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-700 disabled:bg-ink-400",
  dark: "bg-ink-900 text-white hover:bg-ink-700 disabled:bg-ink-400",
  secondary: "border border-line bg-surface text-ink-900 hover:border-ink-400 disabled:text-ink-400",
  ghost: "text-ink-500 hover:bg-soft hover:text-ink-900 disabled:text-ink-400",
  danger: "text-error hover:bg-error-50",
};

const sizes = { sm: "h-9 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-[15px]" };

type BtnProps = { variant?: Variant; size?: keyof typeof sizes; className?: string; children: React.ReactNode };

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  ...rest
}: BtnProps & { href?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100",
    variants[variant],
    sizes[size],
    className,
  );
  if (href)
    return (
      <Link href={href} className={cls}>
        {rest.children}
      </Link>
    );
  return <button type="button" className={cls} {...rest} />;
}

export type Tone = "neutral" | "brand" | "success" | "warning" | "error" | "dark";
const tones: Record<Tone, string> = {
  neutral: "bg-soft text-ink-500",
  brand: "bg-brand-50 text-brand-700",
  success: "bg-success-50 text-success",
  warning: "bg-warning-50 text-warning",
  error: "bg-error-50 text-error",
  dark: "bg-ink-900 text-white",
};

export function Badge({ tone = "neutral", children, className, dot }: { tone?: Tone; children: React.ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Card({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className={cn("scroll-mt-24 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]", className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, sub, action, icon }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-start gap-3">
        {icon && <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-base font-bold">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-ink-500">{sub}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Label({ children, hint, htmlFor }: { children: React.ReactNode; hint?: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-ink-900">
      {children}
      {hint && <span className="text-xs font-normal text-ink-400">{hint}</span>}
    </label>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-ink-400">{children}</p>;
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 py-3", disabled && "cursor-not-allowed opacity-60")}>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-6 w-10 shrink-0 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-4" />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-xl bg-soft p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-semibold transition",
            value === o.value ? "bg-surface text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">{icon}</span>
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "warning" | "brand" }) {
  const t = { neutral: "bg-soft text-ink-500", warning: "bg-warning-50 text-warning", brand: "bg-brand-50 text-brand-700" }[tone];
  return (
    <p className={cn("flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs", t)}>
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export function Thumb({ src, className, alt = "" }: { src?: string; className?: string; alt?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-soft", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- local data URLs and demo assets
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="size-full bg-[repeating-linear-gradient(45deg,#eef1f7_0_8px,#f5f7fb_8px_16px)]" />
      )}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn("animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-2xl", wide ? "sm:max-w-2xl" : "sm:max-w-lg")}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg hover:bg-soft">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const show = useCallback((text: string) => {
    const key = Date.now();
    setMsg({ text, key });
    setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div
          key={msg.key}
          role="status"
          className="animate-rise fixed bottom-6 left-1/2 z-[60] inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-pop)]"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-brand">
            <Check className="size-3" strokeWidth={3} />
          </span>
          {msg.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

export function timeAgo(t: number) {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

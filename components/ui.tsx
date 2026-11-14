"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/util";

type Variant = "primary" | "secondary" | "ghost" | "lime";

const variants: Record<Variant, string> = {
  primary: "bg-ink-900 text-white hover:bg-black disabled:bg-ink-450",
  lime: "bg-lime-400 text-ink-900 hover:brightness-95",
  secondary: "border border-line bg-surface text-ink-900 hover:border-ink-450",
  ghost: "text-ink-650 hover:text-ink-900 hover:bg-soft",
};

const sizes = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-6 text-base",
  sm: "h-9 px-3.5 text-sm",
};

type BtnProps = {
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
  children: React.ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  ...rest
}: BtnProps & { href?: string } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">) {
  const cls = cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-[14px] font-semibold transition disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 focus-visible:ring-offset-2",
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

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "warning" | "success" | "lime" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-soft text-ink-650",
    warning: "bg-warning-100 text-warning",
    success: "bg-lime-100 text-success",
    lime: "bg-lime-400 text-ink-900",
    error: "bg-error-100 text-error",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {tone === "warning" && <span className="size-1.5 rounded-full bg-current" />}
      {tone === "success" && <Check className="size-3" strokeWidth={3} />}
      {children}
    </span>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-[20px] border border-line bg-surface", className)}>{children}</div>;
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink-900">
      {children}
      {hint && <span className="text-xs font-normal text-ink-450">{hint}</span>}
    </span>
  );
}

export function Help({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs text-ink-450">{children}</p>;
}

/* ---------- Toast ---------- */

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const show = useCallback((text: string) => {
    const key = Date.now();
    setMsg({ text, key });
    setTimeout(() => setMsg((m) => (m?.key === key ? null : m)), 2200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <div
          key={msg.key}
          role="status"
          className="animate-toast fixed bottom-28 left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-lime-400 text-ink-900">
            <Check className="size-3" strokeWidth={3} />
          </span>
          {msg.text}
        </div>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

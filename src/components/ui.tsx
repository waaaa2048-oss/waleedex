"use client";

import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/format";
import { Icon, type IconName } from "@/components/icons";

/* ----------------------------- Button ----------------------------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "subtle" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-sm shadow-brand-900/20 hover:from-brand-500 hover:to-brand-700 focus-visible:ring-brand-500/40",
  secondary:
    "bg-white text-ink-700 ring-1 ring-stone-200 hover:bg-stone-50 hover:ring-stone-300 focus-visible:ring-brand-400/40",
  ghost: "text-ink-600 hover:bg-stone-100 hover:text-ink-900 focus-visible:ring-stone-300",
  danger:
    "bg-rose-600 text-white shadow-sm shadow-rose-900/20 hover:bg-rose-700 focus-visible:ring-rose-400/40",
  dark: "bg-ink-900 text-white hover:bg-ink-800 focus-visible:ring-ink-500/40",
  subtle: "bg-brand-50 text-brand-800 ring-1 ring-brand-200 hover:bg-brand-100 focus-visible:ring-brand-400/40",
  outline: "bg-white text-ink-700 ring-1 ring-stone-300 hover:bg-stone-50 focus-visible:ring-brand-400/40",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 rounded-xl px-3 text-[13px]",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-2xl px-6 text-[15px]",
  icon: "h-9 w-9 rounded-xl",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  icon,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold transition-all duration-200 outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : icon ? (
        <Icon name={icon} className="h-4 w-4" strokeWidth={2} />
      ) : null}
      {children}
    </button>
  );
}

/* ------------------------------ Fields ----------------------------- */

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="field-label">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("input min-h-[84px] resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="relative">
      <select className={cn("input appearance-none pl-9", className)} {...props}>
        {children}
      </select>
      <Icon
        name="chevronDown"
        className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

/* ------------------------------ Badge ------------------------------ */

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "brand" | "success" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-stone-100 text-ink-600 ring-stone-200",
    brand: "bg-brand-50 text-brand-800 ring-brand-200",
    success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    danger: "bg-rose-50 text-rose-700 ring-rose-200",
    info: "bg-sky-50 text-sky-800 ring-sky-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ Modal ------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="إغلاق"
        onClick={onClose}
        className="animate-fade fixed inset-0 bg-ink-900/55 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-pop relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl ring-1 ring-ink-900/10 sm:rounded-3xl",
          widths[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {description ? <p className="mt-1 text-xs leading-5 text-ink-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-400 transition hover:bg-stone-100 hover:text-ink-700"
            aria-label="إغلاق"
          >
            <Icon name="close" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 bg-stone-50/70 px-5 py-4 sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* --------------------------- Empty / Skeleton ----------------------- */

export function EmptyState({
  icon = "box",
  title,
  description,
  action,
  className,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-stone-100 text-brand-600 ring-1 ring-brand-100">
        <Icon name={icon} className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-ink-800">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-shimmer rounded-xl", className)} />;
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Icon name={icon} className="h-4.5 w-4.5" />
          </span>
        ) : null}
        <div>
          <h2 className="text-[15px] font-bold text-ink-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-ink-400">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "تأكيد الحذف",
  onCancel,
  onConfirm,
  loading,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onCancel}>
            تراجع
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} loading={loading} icon="trash">
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm leading-7 text-ink-500">
        لا يمكن التراجع عن هذا الإجراء. تأكد من رغبتك في المتابعة قبل الحفظ.
      </p>
    </Modal>
  );
}

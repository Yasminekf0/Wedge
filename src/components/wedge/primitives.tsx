import * as React from "react";

export function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string | null;
}) {
  return (
    <div>
      <label className="label-mono block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3 text-[15px] text-foreground placeholder:text-tertiary-fg focus:border-muted-fg focus:outline-none"
      />
      {hint && !error && <p className="mt-2 text-[12px] text-tertiary-fg">{hint}</p>}
      {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}

export function Section({
  header,
  children,
}: {
  header: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="section-header">{header}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function SkeletonRows() {
  return (
    <div className="space-y-3">
      <div
        className="h-4 w-3/4 rounded-sm"
        style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }}
      />
      <div
        className="h-4 w-1/2 rounded-sm"
        style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }}
      />
      <div
        className="h-4 w-2/3 rounded-sm"
        style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }}
      />
    </div>
  );
}

export function ErrorLine({
  message = "Couldn't generate this right now. Try again.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void | Promise<void>;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-muted-fg">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={() => onRetry()}
          className="mono text-[12px] uppercase tracking-wider text-foreground underline-offset-4 hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

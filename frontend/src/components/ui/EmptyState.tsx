import { type ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400 transition-colors duration-300">
      <p className="font-medium text-ink dark:text-slate-200">{title}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

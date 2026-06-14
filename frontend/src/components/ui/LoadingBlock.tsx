export function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white dark:bg-slate-800 dark:border-slate-700 p-6 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
      <div className="h-2 w-28 animate-pulse rounded-full bg-mint/30" />
      <p className="mt-3">{label}</p>
    </div>
  );
}

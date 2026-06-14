export function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 py-2">
        <div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
          <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
          <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      </div>
      <div className="h-12 w-32 bg-slate-200 dark:bg-slate-700 rounded-full" />
    </div>
  );
}

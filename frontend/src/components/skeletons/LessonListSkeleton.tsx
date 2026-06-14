export function LessonListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-4 p-3 pr-6 rounded-full border border-indigo-50/50 dark:border-slate-700/50">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

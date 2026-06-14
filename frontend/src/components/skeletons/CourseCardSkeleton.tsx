export function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-50/50 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md shadow-indigo-100/30 flex flex-col h-full font-sans animate-pulse">
      <div className="h-44 w-full bg-slate-200 dark:bg-slate-700" />
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md mt-3" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
        </div>
        <div className="flex items-center gap-3 border-t border-indigo-50/50 dark:border-slate-700/50 pt-4 mt-5 mb-4">
          <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex-1" />
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex-1" />
        </div>
      </div>
    </div>
  );
}

export function CourseDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start animate-pulse">
      <div className="space-y-8">
        <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 sm:p-8 lg:p-10 shadow-xl shadow-indigo-100/20">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
        </div>
        <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 p-3 pr-6 rounded-full border border-indigo-50/50 dark:border-slate-700/50">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 shadow-xl shadow-indigo-100/20 flex flex-col gap-6 w-full">
        <div className="h-44 w-full bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="space-y-4 border-t border-indigo-50 dark:border-slate-700/50 pt-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

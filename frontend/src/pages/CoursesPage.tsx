import { useState } from "react";
import { useGetCoursesQuery } from "../services/lmsApi";
import { CourseCard } from "../features/courses/components/CourseCard";
import { CourseCardSkeleton } from "../components/skeletons/CourseCardSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";

export function CoursesPage() {
  const [search, setSearch] = useState("");
  const { data: courses = [], error, isLoading } = useGetCoursesQuery({ search });

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col gap-5 rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#1e1b4b] dark:text-white font-header">Course Catalog</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-sans">
            {isLoading ? "Searching..." : `${courses.length} courses available`}
          </p>
        </div>
        <div className="relative flex items-center w-full sm:max-w-md">
          <div className="absolute left-4 text-indigo-400 dark:text-slate-500 pointer-events-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="w-full rounded-full border border-indigo-100 dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-950 py-3.5 pl-12 pr-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 dark:text-slate-100 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:bg-white dark:focus:bg-slate-900 font-sans"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses..."
            value={search}
          />
        </div>
      </div>

      {error ? <ErrorBanner error={error} /> : null}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <CourseCardSkeleton key={n} />
          ))}
        </div>
      ) : courses.length ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          ))}
        </div>
      ) : (
        <EmptyState title="No courses match your search." />
      )}
    </section>
  );
}

export default CoursesPage;

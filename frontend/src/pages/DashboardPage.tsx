import { Link } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useGetDashboardQuery, useGetCoursesQuery } from "../services/lmsApi";
import { CourseCard } from "../features/courses/components/CourseCard";
import { CourseCardSkeleton } from "../components/skeletons/CourseCardSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";

export function DashboardPage() {
  const user = useCurrentUser();
  const { data: stats, error: statsError, isLoading: statsLoading } = useGetDashboardQuery();
  const { data: courses = [], isLoading: coursesLoading } = useGetCoursesQuery(
    user?.role === "instructor" ? { mine: true } : undefined,
  );

  const statCards = [
    {
      label: "Total Courses",
      value: stats?.total_courses ?? 0,
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f20f0]/10 text-[#4f20f0]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
      ),
    },
    {
      label: "Total Students",
      value: stats?.total_students ?? 0,
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#45c3b8]/10 text-[#45c3b8]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
      ),
    },
    {
      label: "Total Enrollments",
      value: stats?.total_enrollments ?? 0,
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4f20f0]/10 text-[#4f20f0]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      ),
    },
    {
      label: user?.role === "instructor" ? "My Courses" : "Enrolled Courses",
      value: stats?.my_courses ?? 0,
      icon: (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#45c3b8]/10 text-[#45c3b8]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto">
      {statsError ? <ErrorBanner error={statsError} /> : null}
      
      {/* Responsive Stat Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div className="rounded-2xl border border-indigo-50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-md shadow-indigo-100/50 dark:shadow-none flex items-center justify-between transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100/50 dark:hover:shadow-none hover:translate-y-[-2px]" key={stat.label}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">{stat.label}</p>
              <p className="mt-1.5 text-3xl font-extrabold text-[#1e1b4b] dark:text-white font-header">
                {statsLoading ? (
                  <span className="block h-8 w-12 animate-pulse rounded bg-slate-100 dark:bg-slate-700" />
                ) : (
                  stat.value
                )}
              </p>
            </div>
            {stat.icon}
          </div>
        ))}
      </div>

      {/* Available Courses panel */}
      <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-indigo-50 dark:border-slate-800 pb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#1e1b4b] dark:text-white font-header">
              {user?.role === "instructor" ? "My Course Activity" : "Available Courses"}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-sans">
              {user?.role === "instructor"
                ? `${stats?.my_enrollments ?? 0} enrollments across your courses`
                : "Browse and continue learning"}
            </p>
          </div>
          <Link
            className="rounded-full bg-[#4f20f0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] text-center font-sans"
            to={user?.role === "instructor" ? "/instructor/courses" : "/courses"}
          >
            {user?.role === "instructor" ? "+ New Course" : "Browse Courses"}
          </Link>
        </div>

        <div className="mt-8">
          {coursesLoading ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((n) => (
                <CourseCardSkeleton key={n} />
              ))}
            </div>
          ) : courses.length ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 3).map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          ) : (
            <EmptyState title="No courses found." />
          )}
        </div>
      </div>
    </section>
  );
}

export default DashboardPage;

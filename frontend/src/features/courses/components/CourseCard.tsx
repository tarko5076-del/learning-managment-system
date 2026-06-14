import { Link } from "react-router-dom";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { useEnrollMutation } from "../../../services/lmsApi";
import type { Course } from "../../../types";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";

export function CourseCard({ course }: { course: Course }) {
  const user = useCurrentUser();
  const [enroll, { error, isLoading, isSuccess }] = useEnrollMutation();
  const learned = course.is_enrolled || isSuccess;

  const handleEnroll = async () => {
    await enroll({ course_id: course.id }).unwrap();
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md shadow-indigo-100/30 dark:shadow-none transition-all duration-300 hover:shadow-xl hover:shadow-indigo-100/60 dark:hover:shadow-none hover:translate-y-[-4px] hover:scale-[1.02] flex flex-col h-full font-sans">
      {course.thumbnail_url ? (
        <img alt={course.title} className="h-44 w-full object-cover" src={course.thumbnail_url} />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#4f20f0] to-[#6d44fc] text-4xl font-extrabold text-white font-header shadow-inner select-none">
          {course.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          <span className="inline-block bg-[#45c3b8]/10 text-[#45c3b8] dark:bg-[#45c3b8]/20 font-bold px-3 py-1 rounded-full text-xs font-sans tracking-wide">
            {course.category.name}
          </span>
          <h3 className="mt-3 text-lg font-extrabold text-[#1e1b4b] dark:text-white font-header line-clamp-1 hover:text-[#4f20f0] dark:hover:text-indigo-400 transition-colors">
            {course.title}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-sans line-clamp-3 leading-relaxed">
            {course.description}
          </p>
        </div>

        {user?.role === "student" && learned && (
          <div className="mt-4 mb-2">
            <div className="flex justify-between items-center text-xs font-bold text-[#3b2c85] dark:text-indigo-300 mb-1">
              <span>Progress</span>
              <span>{Math.round(course.progress_percentage ?? 0)}%</span>
            </div>
            <div className="h-2 w-full bg-indigo-50 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#4f20f0] to-[#45c3b8] rounded-full transition-all duration-500" 
                style={{ width: `${course.progress_percentage ?? 0}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-400 dark:text-slate-500 font-sans border-t border-indigo-50/50 dark:border-slate-800/50 pt-4 mt-5 mb-4">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-indigo-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            {course.lessons_count} lessons
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-indigo-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {course.enrollments_count} enrolled
          </span>
          <span>•</span>
          <span className="truncate max-w-[120px]">By {course.instructor.full_name}</span>
        </div>

        {error ? <div className="mb-3"><ErrorBanner error={error} /></div> : null}

        <div className="flex gap-2.5">
          <Link
            className="rounded-full border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-slate-700 hover:text-[#4f20f0] dark:hover:text-[#4f20f0] hover:border-[#4f20f0] dark:hover:border-[#4f20f0] transition-all font-sans text-center flex-1"
            to={`/courses/${course.id}`}
          >
            View
          </Link>
          {user?.role === "student" && learned ? (
            <Link
              className="rounded-full bg-[#4f20f0] px-5 py-2.5 text-xs font-bold text-white shadow-md dark:shadow-none hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] text-center flex-1 font-sans"
              to={`/learn/${course.id}`}
            >
              Learn
            </Link>
          ) : null}
          {user?.role === "student" && !learned ? (
            <button
              className="rounded-full bg-[#4f20f0] px-5 py-2.5 text-xs font-bold text-white shadow-md dark:shadow-none hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 text-center flex-1 font-sans"
              disabled={isLoading}
              onClick={handleEnroll}
              type="button"
            >
              {isLoading ? "Enrolling..." : "Enroll"}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

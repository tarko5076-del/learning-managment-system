import { Link } from "react-router-dom";
import { useGetMyCoursesQuery } from "../services/lmsApi";
import { CourseCard } from "../features/courses/components/CourseCard";
import { CourseCardSkeleton } from "../components/skeletons/CourseCardSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";

export function MyCoursesPage() {
  const { data: courses = [], error, isLoading } = useGetMyCoursesQuery();

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="border-b border-indigo-50 dark:border-slate-800 pb-5">
        <h2 className="text-2xl font-extrabold text-[#1e1b4b] dark:text-white font-header">My Enrolled Courses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-sans">
          {isLoading ? "Loading your courses..." : `You are enrolled in ${courses.length} courses`}
        </p>
      </div>

      {error ? <ErrorBanner error={error} /> : null}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
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
        <EmptyState title="No enrolled courses yet.">
          <Link className="font-bold text-[#4f20f0] hover:underline hover:text-[#3b1cd9]" to="/courses">
            Browse courses
          </Link>
        </EmptyState>
      )}
    </section>
  );
}

export default MyCoursesPage;

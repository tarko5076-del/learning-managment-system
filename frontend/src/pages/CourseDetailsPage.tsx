import { Link, useParams } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useGetCourseQuery, useGetLessonsQuery, useEnrollMutation } from "../services/lmsApi";
import { CourseDetailsSkeleton } from "../components/skeletons/CourseDetailsSkeleton";
import { LessonListSkeleton } from "../components/skeletons/LessonListSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";
import { formatDate } from "../utils/helpers";

export function CourseDetailsPage() {
  const { id } = useParams();
  const user = useCurrentUser();
  const {
    data: course,
    error,
    isLoading,
    refetch,
  } = useGetCourseQuery(id ?? "", { skip: !id });
  const canAccessLessons =
    !!course &&
    ((user?.role === "instructor" && course.instructor.id === user.id) ||
      (user?.role === "student" && course.is_enrolled));
  const { data: lessons = [], isLoading: lessonsLoading } = useGetLessonsQuery(
    { course: id ?? "" },
    { skip: !id || !canAccessLessons },
  );
  const [enroll, { error: enrollError, isLoading: enrolling }] = useEnrollMutation();

  const handleEnroll = async () => {
    if (!course) {
      return;
    }

    await enroll({ course_id: course.id }).unwrap();
    refetch();
  };

  if (isLoading) {
    return (
      <section className="px-6 py-8 max-w-7xl mx-auto font-sans">
        <CourseDetailsSkeleton />
      </section>
    );
  }

  if (error || !course) {
    return (
      <section className="px-6 py-8 max-w-7xl mx-auto font-sans">
        <ErrorBanner error={error ?? "Course not found."} />
      </section>
    );
  }

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
        {/* Left column: main course details & lessons */}
        <div className="space-y-8">
          {/* Main Info Card */}
          <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 shadow-xl shadow-indigo-100/20 dark:shadow-none">
            <span className="inline-block bg-[#45c3b8]/10 text-[#45c3b8] dark:bg-[#45c3b8]/20 font-bold px-3 py-1 rounded-full text-xs font-sans tracking-wide">
              {course.category.name}
            </span>
            <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-[#1e1b4b] dark:text-white font-header leading-tight">
              {course.title}
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-500 dark:text-slate-400 font-sans leading-relaxed">
              {course.description}
            </p>
          </div>

          {/* Lessons Card */}
          <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none">
            <h3 className="text-xl font-extrabold text-[#1e1b4b] dark:text-white font-header border-b border-indigo-50 dark:border-slate-800 pb-4 mb-6">Lessons</h3>
            {!canAccessLessons ? (
              <div className="rounded-2xl bg-[#f8fafc] dark:bg-slate-950 p-6 text-center border border-indigo-50/50 dark:border-slate-800">
                <svg className="w-10 h-10 text-indigo-300 dark:text-slate-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-sm font-semibold text-[#1e1b4b] dark:text-slate-300 font-sans">Enroll in this course to access lessons.</p>
              </div>
            ) : lessonsLoading ? (
              <LessonListSkeleton />
            ) : lessons.length ? (
              <div className="space-y-4">
                {lessons.map((lesson) => (
                  <div className="flex items-center gap-4 p-3 pr-6 rounded-full border border-indigo-50/50 dark:border-slate-800 hover:bg-[#f8fafc]/80 dark:hover:bg-slate-800/50 transition-all duration-200" key={lesson.id}>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-slate-800 text-[#4f20f0] dark:text-indigo-400 font-bold text-sm font-header">
                      {lesson.is_completed ? (
                        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        lesson.order
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-[#1e1b4b] dark:text-white font-sans truncate">{lesson.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans truncate">{lesson.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No lessons have been added yet." />
            )}
          </div>
        </div>

        {/* Right column: Sticky checkout & metadata card */}
        <aside className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl shadow-indigo-100/20 dark:shadow-none lg:sticky lg:top-8 flex flex-col gap-6 w-full">
          {/* Course Thumbnail */}
          <div className="relative h-48 sm:h-56 lg:h-44 w-full overflow-hidden rounded-2xl shadow-inner bg-slate-100 dark:bg-slate-950">
            {course.thumbnail_url ? (
              <img alt={course.title} className="h-full w-full object-cover" src={course.thumbnail_url} />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#4f20f0] to-[#6d44fc] text-5xl font-extrabold text-white font-header select-none">
                {course.title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Enroll / Start learning buttons */}
          <div className="space-y-3">
            {enrollError ? <ErrorBanner error={enrollError} /> : null}

            {user?.role === "student" && !course.is_enrolled ? (
              <button
                className="w-full rounded-full bg-[#4f20f0] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f20f0]/25 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 font-sans"
                disabled={enrolling}
                onClick={handleEnroll}
                type="button"
              >
                {enrolling ? "Enrolling..." : "Enroll in course"}
              </button>
            ) : null}

            {user?.role === "student" && course.is_enrolled ? (
              <Link
                className="w-full text-center inline-block rounded-full bg-[#4f20f0] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#4f20f0]/25 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] font-sans"
                to={`/learn/${course.id}`}
              >
                Start learning
              </Link>
            ) : null}

            {user?.role === "instructor" && (
              <Link
                className="w-full text-center inline-block rounded-full border border-indigo-100 dark:border-slate-700 px-8 py-3.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-slate-800 hover:text-[#4f20f0] dark:hover:text-indigo-400 hover:border-[#4f20f0] dark:hover:border-[#4f20f0] transition-all font-sans"
                to="/instructor/courses"
              >
                Manage courses
              </Link>
            )}
          </div>

          {/* Metadata list */}
          <div className="space-y-4 border-t border-indigo-50 dark:border-slate-800 pt-5">
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-sans">
              <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Instructor: <strong className="text-[#1e1b4b] dark:text-white font-bold">{course.instructor.full_name}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-sans">
              <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Lessons: <strong className="text-[#1e1b4b] dark:text-white font-bold">{course.lessons_count}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-sans">
              <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Enrollments: <strong className="text-[#1e1b4b] dark:text-white font-bold">{course.enrollments_count}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300 font-sans">
              <svg className="w-5 h-5 text-indigo-400 dark:text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Created: <strong className="text-[#1e1b4b] dark:text-white font-bold">{formatDate(course.created_at)}</strong></span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default CourseDetailsPage;

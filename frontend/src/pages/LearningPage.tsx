import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useGetCourseQuery, useGetLessonsQuery, useUpdateLessonProgressMutation } from "../services/lmsApi";
import { CourseDetailsSkeleton } from "../components/skeletons/CourseDetailsSkeleton";
import { LessonListSkeleton } from "../components/skeletons/LessonListSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";
import { getYoutubeEmbedUrl } from "../utils/helpers";

export function LearningPage() {
  const { id } = useParams();
  const user = useCurrentUser();
  const { data: course, error: courseError, isLoading: courseLoading } = useGetCourseQuery(id ?? "", {
    skip: !id,
  });
  const canAccess =
    !!course &&
    ((user?.role === "student" && course.is_enrolled) ||
      (user?.role === "instructor" && course.instructor.id === user.id));
  const {
    data: lessons = [],
    error: lessonsError,
    isLoading: lessonsLoading,
  } = useGetLessonsQuery({ course: id ?? "" }, { skip: !id || !canAccess });
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [updateProgress, { isLoading: isUpdatingProgress }] = useUpdateLessonProgressMutation();

  useEffect(() => {
    if (lessons.length && !lessons.some((lesson) => lesson.id === activeLessonId)) {
      setActiveLessonId(lessons[0].id);
    }
  }, [activeLessonId, lessons]);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];

  const handleToggleComplete = async () => {
    if (!activeLesson) return;
    try {
      await updateProgress({
        lesson_id: activeLesson.id,
        completed: !activeLesson.is_completed,
      }).unwrap();
    } catch {
      // Ignored: mutation handles feedback or triggers state updates
    }
  };

  if (courseLoading) {
    return (
      <section className="px-6 py-8 max-w-7xl mx-auto font-sans">
        <CourseDetailsSkeleton />
      </section>
    );
  }

  if (courseError || !course) {
    return (
      <section className="px-6 py-8 max-w-7xl mx-auto font-sans">
        <ErrorBanner error={courseError ?? "Course not found."} />
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="px-6 py-8 max-w-7xl mx-auto font-sans">
        <EmptyState title="You are not enrolled in this course.">
          <Link className="font-bold text-[#4f20f0] hover:underline" to={`/courses/${course.id}`}>
            View course
          </Link>
        </EmptyState>
      </section>
    );
  }

  const embedUrl = activeLesson?.video_url ? getYoutubeEmbedUrl(activeLesson.video_url) : "";

  const completedLessons = lessons.filter((l) => l.is_completed).length;
  const totalLessons = lessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <section className="grid gap-6 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans grid-cols-1 lg:grid-cols-[300px_1fr]">
      {/* Sidebar navigator */}
      <aside className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xl shadow-indigo-100/20 dark:shadow-none self-start w-full transition-colors duration-300">
        <div className="border-b border-indigo-50 dark:border-slate-800 pb-4 mb-4">
          <h2 className="text-lg font-extrabold text-[#1e1b4b] dark:text-white font-header truncate">{course.title}</h2>
          {user?.role === "student" && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#3b2c85] dark:text-indigo-300 mb-1">
                <span>Course Progress</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full bg-[#f8fafc] dark:bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#4f20f0] to-[#45c3b8] rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1.5 text-2xs text-slate-500 dark:text-slate-400 font-semibold">
                {completedLessons} of {totalLessons} lessons completed
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {lessonsError ? <ErrorBanner error={lessonsError} /> : null}
          {lessonsLoading ? (
            <LessonListSkeleton />
          ) : lessons.length ? (
            lessons.map((lesson) => (
              <button
                className={[
                  "w-full rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 font-sans flex items-center gap-3",
                  activeLesson?.id === lesson.id
                    ? "bg-[#4f20f0] text-white shadow-md shadow-indigo-500/10"
                    : "bg-[#f8fafc] dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 hover:text-[#4f20f0] dark:hover:text-indigo-400",
                ].join(" ")}
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                type="button"
              >
                {/* Visual completion / active state icon */}
                {lesson.is_completed ? (
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : activeLesson?.id === lesson.id ? (
                  <svg className="w-5 h-5 text-white animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-indigo-400 dark:text-slate-600 hover:text-[#4f20f0] dark:hover:text-indigo-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className="truncate">{lesson.order}. {lesson.title}</span>
              </button>
            ))
          ) : (
            <EmptyState title="No lessons available." />
          )}
        </div>
      </aside>

      {/* Main Content Player */}
      <article className="rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none flex flex-col justify-between h-full transition-colors duration-300">
        {activeLesson ? (
          <div>
            <span className="inline-block bg-[#45c3b8]/10 text-[#45c3b8] dark:bg-[#45c3b8]/20 font-bold px-3 py-1 rounded-full text-xs font-sans tracking-wide">
              Lesson {activeLesson.order}
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#1e1b4b] dark:text-white font-header leading-tight">{activeLesson.title}</h2>
            
            {activeLesson.video_url ? (
              <div className="mt-6">
                {embedUrl ? (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl border border-indigo-50 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950 mb-6">
                    <iframe
                      title={activeLesson.title}
                      src={embedUrl}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a
                    className="inline-flex rounded-full border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-2.5 text-sm font-bold text-[#4f20f0] dark:text-indigo-400 hover:bg-[#4f20f0] dark:hover:bg-[#4f20f0] hover:text-white dark:hover:text-white hover:border-[#4f20f0] dark:hover:border-[#4f20f0] shadow-sm hover:shadow-md transition-all font-sans items-center gap-2 mb-6"
                    href={activeLesson.video_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Open Video Resource</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            ) : null}
            <p className="mt-5 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300 font-sans text-sm sm:text-base">{activeLesson.content}</p>

            {/* Complete / Toggle completion button */}
            {user?.role === "student" && (
              <button
                onClick={handleToggleComplete}
                disabled={isUpdatingProgress}
                className={[
                  "mt-8 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold transition-all duration-200 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                  activeLesson.is_completed
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                    : "bg-[#4f20f0] hover:bg-[#3b1cd9] text-white shadow-lg shadow-indigo-500/20"
                ].join(" ")}
                type="button"
              >
                {activeLesson.is_completed ? (
                  <>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Completed</span>
                  </>
                ) : (
                  <span>Mark as Completed</span>
                )}
              </button>
            )}
          </div>
        ) : (
          <EmptyState title="Select a lesson to begin." />
        )}
      </article>
    </section>
  );
}

export default LearningPage;

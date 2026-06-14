import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  useGetCoursesQuery,
  useGetLessonsQuery,
  useCreateLessonMutation,
  useUpdateLessonMutation,
  useDeleteLessonMutation,
} from "../services/lmsApi";
import type { Lesson } from "../types";
import { LessonForm } from "../features/lessons/components/LessonForm";
import { ProfileSkeleton } from "../components/skeletons/ProfileSkeleton";
import { LessonListSkeleton } from "../components/skeletons/LessonListSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";
import { getErrorMessage } from "../utils/helpers";

export function InstructorLessonsPage() {
  const { data: courses = [], isLoading: coursesLoading } = useGetCoursesQuery({ mine: true });
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [createLesson, { isLoading: creating }] = useCreateLessonMutation();
  const [updateLesson, { isLoading: updating }] = useUpdateLessonMutation();
  const [deleteLesson] = useDeleteLessonMutation();

  useEffect(() => {
    if (!selectedCourseId && courses.length) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const {
    data: lessons = [],
    error,
    isLoading,
  } = useGetLessonsQuery(
    { course: selectedCourseId ?? "" },
    { skip: !selectedCourseId },
  );

  const handleSave = async (lesson: Omit<Lesson, "id" | "course_title">) => {
    if (editing) {
      await updateLesson({ id: editing.id, body: lesson }).unwrap();
      setEditing(null);
      return;
    }

    await createLesson(lesson).unwrap();
  };

  const handleDelete = async (lesson: Lesson) => {
    setDeleteError("");
    if (!window.confirm(`Delete "${lesson.title}"?`)) {
      return;
    }

    try {
      await deleteLesson(lesson.id).unwrap();
    } catch (deleteRequestError) {
      setDeleteError(getErrorMessage(deleteRequestError));
    }
  };

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="rounded-3xl border border-indigo-50/50 bg-white p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-indigo-50 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-[#1e1b4b] font-header">Manage Lessons</h2>
          <select
            className="rounded-full border border-indigo-200 bg-white py-2.5 px-5 text-sm font-semibold text-slate-700 outline-none focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 transition-all font-sans cursor-pointer"
            disabled={!courses.length}
            onChange={(event) => {
              setSelectedCourseId(Number(event.target.value));
              setEditing(null);
            }}
            value={selectedCourseId ?? ""}
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          {coursesLoading ? (
            <ProfileSkeleton />
          ) : selectedCourseId ? (
            <LessonForm
              courseId={selectedCourseId}
              initialLesson={editing}
              isSaving={creating || updating}
              key={`${selectedCourseId}-${editing?.id ?? "new-lesson"}`}
              onCancel={editing ? () => setEditing(null) : undefined}
              onSave={handleSave}
            />
          ) : (
            <EmptyState title="Create a course before adding lessons.">
              <Link className="font-semibold text-[#4f20f0] hover:underline" to="/instructor/courses">
                Go to course management
              </Link>
            </EmptyState>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-50/50 bg-white p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
        <h2 className="text-xl font-extrabold text-[#1e1b4b] font-header border-b border-indigo-50 pb-4 mb-6">Lessons</h2>
        <div className="mt-6 space-y-4">
          {error ? <ErrorBanner error={error} /> : null}
          {deleteError ? <ErrorBanner error={deleteError} /> : null}
          {isLoading ? (
            <LessonListSkeleton />
          ) : lessons.length ? (
            lessons.map((lesson) => (
              <div
                className="flex flex-col gap-4 rounded-2xl border border-indigo-50/50 bg-white p-5 shadow-sm shadow-indigo-100/10 lg:flex-row lg:items-center lg:justify-between transition-all duration-300 hover:shadow-md hover:translate-y-[-1px]"
                key={lesson.id}
              >
                <div>
                  <p className="font-semibold text-slate-800 font-sans text-base">
                    {lesson.order}. {lesson.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 font-sans">{lesson.course_title}</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    className="rounded-full border border-indigo-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50/50 hover:text-[#4f20f0] hover:border-[#4f20f0] transition-all font-sans text-center"
                    onClick={() => setEditing(lesson)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-full bg-coral px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#45c3b8]/10 hover:bg-[#3ba89f] transition-all hover:scale-[1.02] active:scale-[0.98] text-center font-sans"
                    onClick={() => void handleDelete(lesson)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No lessons for this course yet." />
          )}
        </div>
      </div>
    </section>
  );
}

export default InstructorLessonsPage;

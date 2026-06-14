import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useGetCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from "../services/lmsApi";
import type { Course } from "../types";
import { CourseForm } from "../features/courses/components/CourseForm";
import { LessonListSkeleton } from "../components/skeletons/LessonListSkeleton";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { EmptyState } from "../components/ui/EmptyState";
import { getErrorMessage } from "../utils/helpers";

export function InstructorCoursesPage() {
  const { data: courses = [], error, isLoading } = useGetCoursesQuery({ mine: true });
  const [createCourse, { isLoading: creating }] = useCreateCourseMutation();
  const [updateCourse, { isLoading: updating }] = useUpdateCourseMutation();
  const [deleteCourse] = useDeleteCourseMutation();
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const handleSave = async (data: FormData) => {
    if (editing) {
      await updateCourse({ id: editing.id, body: data }).unwrap();
      setEditing(null);
      return;
    }

    await createCourse(data).unwrap();
  };

  const handleDelete = async (course: Course) => {
    setDeleteError("");
    if (!window.confirm(`Delete "${course.title}"?`)) {
      return;
    }

    try {
      await deleteCourse(course.id).unwrap();
    } catch (deleteRequestError) {
      setDeleteError(getErrorMessage(deleteRequestError));
    }
  };

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="rounded-3xl border border-indigo-50/50 bg-white p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
        <h2 className="text-xl font-extrabold text-[#1e1b4b] font-header border-b border-indigo-50 pb-4 mb-6">{editing ? "Edit Course" : "Create Course"}</h2>
        <div>
          <CourseForm
            initialCourse={editing}
            isSaving={creating || updating}
            key={editing?.id ?? "new-course"}
            onCancel={editing ? () => setEditing(null) : undefined}
            onSave={handleSave}
          />
        </div>
      </div>

      <div className="rounded-3xl border border-indigo-50/50 bg-white p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
        <h2 className="text-xl font-extrabold text-[#1e1b4b] font-header border-b border-indigo-50 pb-4 mb-6">My Courses</h2>
        <div className="mt-6 space-y-4">
          {error ? <ErrorBanner error={error} /> : null}
          {deleteError ? <ErrorBanner error={deleteError} /> : null}
          {isLoading ? (
            <LessonListSkeleton />
          ) : courses.length ? (
            courses.map((course) => (
              <div
                className="flex flex-col gap-4 rounded-2xl border border-indigo-50/50 bg-white p-5 shadow-sm shadow-indigo-100/10 lg:flex-row lg:items-center lg:justify-between transition-all duration-300 hover:shadow-md hover:translate-y-[-1px]"
                key={course.id}
              >
                <div>
                  <p className="font-semibold text-slate-800 font-sans text-base">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-500 font-sans">
                    {course.category.name} • {course.lessons_count} lessons •{" "}
                    {course.enrollments_count} enrollments
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <Link
                    className="rounded-full border border-indigo-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50/50 hover:text-[#4f20f0] hover:border-[#4f20f0] transition-all font-sans text-center"
                    to={`/courses/${course.id}`}
                  >
                    View
                  </Link>
                  <button
                    className="rounded-full border border-indigo-100 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50/50 hover:text-[#4f20f0] hover:border-[#4f20f0] transition-all font-sans text-center"
                    onClick={() => setEditing(course)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-full bg-coral px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#45c3b8]/10 hover:bg-[#3ba89f] transition-all hover:scale-[1.02] active:scale-[0.98] text-center font-sans"
                    onClick={() => void handleDelete(course)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="You have not created courses yet." />
          )}
        </div>
      </div>
    </section>
  );
}

export default InstructorCoursesPage;

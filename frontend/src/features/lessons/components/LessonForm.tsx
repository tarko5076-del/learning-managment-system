import { type FormEvent, useEffect, useState } from "react";
import type { Lesson } from "../../../types";
import { FieldError } from "../../../components/ui/FieldError";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { lessonSchema } from "../../../utils/schemas";
import { type FieldErrors, getErrorMessage, toFieldErrors } from "../../../utils/helpers";

type LessonFormProps = {
  courseId: number;
  initialLesson?: Lesson | null;
  isSaving: boolean;
  onCancel?: () => void;
  onSave: (lesson: Omit<Lesson, "id" | "course_title">) => Promise<void>;
};

export function LessonForm({ courseId, initialLesson, isSaving, onCancel, onSave }: LessonFormProps) {
  const [values, setValues] = useState({
    title: initialLesson?.title ?? "",
    content: initialLesson?.content ?? "",
    video_url: initialLesson?.video_url ?? "",
    order: initialLesson ? String(initialLesson.order) : "1",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    setValues({
      title: initialLesson?.title ?? "",
      content: initialLesson?.content ?? "",
      video_url: initialLesson?.video_url ?? "",
      order: initialLesson ? String(initialLesson.order) : "1",
    });
    setErrors({});
    setServerError("");
  }, [initialLesson]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    const parsed = lessonSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      await onSave({
        course: courseId,
        title: parsed.data.title,
        content: parsed.data.content,
        video_url: parsed.data.video_url,
        order: parsed.data.order,
        is_completed: initialLesson?.is_completed ?? false,
        completed_at: initialLesson?.completed_at ?? null,
      });

      if (!initialLesson) {
        setValues({ title: "", content: "", video_url: "", order: String(parsed.data.order + 1) });
      }
      setErrors({});
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {serverError ? <ErrorBanner error={serverError} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1fr_140px]">
        <div>
          <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="lesson-title">
            Title
          </label>
          <input
            className="w-full rounded-full border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
            id="lesson-title"
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            value={values.title}
          />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="lesson-order">
            Order
          </label>
          <input
            className="w-full rounded-full border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
            id="lesson-order"
            min="1"
            onChange={(event) => setValues((current) => ({ ...current, order: event.target.value }))}
            type="number"
            value={values.order}
          />
          <FieldError message={errors.order} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="lesson-video">
          Video URL
        </label>
        <input
          className="w-full rounded-full border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
          id="lesson-video"
          onChange={(event) =>
            setValues((current) => ({ ...current, video_url: event.target.value }))
          }
          value={values.video_url}
        />
        <FieldError message={errors.video_url} />
      </div>
      <div>
        <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="lesson-content">
          Content
        </label>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
          id="lesson-content"
          onChange={(event) =>
            setValues((current) => ({ ...current, content: event.target.value }))
          }
          value={values.content}
        />
        <FieldError message={errors.content} />
      </div>
      <div className="flex flex-wrap gap-2.5 pt-2">
        <button
          className="rounded-full bg-[#4f20f0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 font-sans"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : initialLesson ? "Update lesson" : "Create lesson"}
        </button>
        {onCancel ? (
          <button
            className="rounded-full border border-indigo-100 px-6 py-3 text-sm font-bold text-slate-600 hover:bg-indigo-50/50 hover:text-[#4f20f0] transition-all font-sans"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

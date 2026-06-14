import { type FormEvent, useEffect, useState } from "react";
import { useGetCategoriesQuery } from "../../../services/lmsApi";
import type { Course } from "../../../types";
import { FieldError } from "../../../components/ui/FieldError";
import { ErrorBanner } from "../../../components/ui/ErrorBanner";
import { courseSchema } from "../../../utils/schemas";
import { type FieldErrors, getErrorMessage, toFieldErrors } from "../../../utils/helpers";

type CourseFormProps = {
  initialCourse?: Course | null;
  isSaving: boolean;
  onCancel?: () => void;
  onSave: (data: FormData) => Promise<void>;
};

export function CourseForm({ initialCourse, isSaving, onCancel, onSave }: CourseFormProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const [values, setValues] = useState({
    title: initialCourse?.title ?? "",
    description: initialCourse?.description ?? "",
    category_name: initialCourse?.category.name ?? "",
    thumbnail: null as File | null,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    setValues({
      title: initialCourse?.title ?? "",
      description: initialCourse?.description ?? "",
      category_name: initialCourse?.category.name ?? "",
      thumbnail: null,
    });
    setErrors({});
    setServerError("");
  }, [initialCourse]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    const parsed = courseSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    const data = new FormData();
    data.append("title", parsed.data.title);
    data.append("description", parsed.data.description);
    data.append("category_name", parsed.data.category_name);

    if (values.thumbnail) {
      data.append("thumbnail", values.thumbnail);
    }

    try {
      await onSave(data);
      if (!initialCourse) {
        setValues({ title: "", description: "", category_name: "", thumbnail: null });
      }
      setErrors({});
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {serverError ? <ErrorBanner error={serverError} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="course-title">
            Title
          </label>
          <input
            className="w-full rounded-full border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
            id="course-title"
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            value={values.title}
          />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="course-category">
            Category
          </label>
          <input
            className="w-full rounded-full border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
            id="course-category"
            list="category-options"
            onChange={(event) =>
              setValues((current) => ({ ...current, category_name: event.target.value }))
            }
            value={values.category_name}
          />
          <datalist id="category-options">
            {categories.map((category) => (
              <option key={category.id} value={category.name} />
            ))}
          </datalist>
          <FieldError message={errors.category_name} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="course-description">
          Description
        </label>
        <textarea
          className="min-h-28 w-full rounded-2xl border border-indigo-200 bg-white py-3 px-6 text-sm outline-none transition-all placeholder:text-slate-400 text-slate-800 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 font-sans"
          id="course-description"
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          value={values.description}
        />
        <FieldError message={errors.description} />
      </div>
      <div>
        <label className="text-sm font-semibold text-[#3b2c85] mb-1.5 ml-1 block" htmlFor="course-thumbnail">
          Thumbnail
        </label>
        <input
          accept="image/*"
          className="mt-1 w-full rounded-full border border-indigo-200 bg-white py-2 px-6 text-sm outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-[#4f20f0] hover:file:bg-indigo-100 cursor-pointer"
          id="course-thumbnail"
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              thumbnail: event.target.files?.[0] ?? null,
            }))
          }
          type="file"
        />
      </div>
      <div className="flex flex-wrap gap-2.5 pt-2">
        <button
          className="rounded-full bg-[#4f20f0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/10 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 font-sans"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : initialCourse ? "Update course" : "Create course"}
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

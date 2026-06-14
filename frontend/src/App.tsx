import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { z } from "zod";

import loginIllustration from "./assets/login-illustration.png";
import registerIllustration from "./assets/register-illustration.png";

import type { AppDispatch, RootState } from "./app/store";
import { logout, setCredentials, setUser } from "./features/auth/authSlice";
import {
  useChangePasswordMutation,
  useCreateCategoryMutation,
  useCreateCourseMutation,
  useCreateLessonMutation,
  useDeleteCategoryMutation,
  useDeleteCourseMutation,
  useDeleteLessonMutation,
  useEnrollMutation,
  useGetCategoriesQuery,
  useGetCourseQuery,
  useGetCoursesQuery,
  useGetDashboardQuery,
  useGetInstructorsQuery,
  useGetLessonsQuery,
  useGetMyCoursesQuery,
  useGetProfileQuery,
  useLoginMutation,
  useLogoutSessionMutation,
  useRegisterMutation,
  useResetPasswordMutation,
  useUpdateCategoryMutation,
  useUpdateCourseMutation,
  useUpdateLessonMutation,
  useUpdateLessonProgressMutation,
  useUpdateProfileMutation,
} from "./services/lmsApi";
import type { AuthResponse, Category, Course, Lesson, Role } from "./types";

type FieldErrors = Record<string, string>;

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  full_name: z.string().min(2, "User name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  password_confirmation: z.string().min(8, "Confirm your password."),
  role: z.enum(["student", "instructor"]),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords do not match.",
  path: ["password_confirmation"],
});

const courseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  category_name: z.string().min(2, "Category is required."),
});

const lessonSchema = z.object({
  title: z.string().min(3, "Lesson title must be at least 3 characters."),
  content: z.string().min(10, "Lesson content must be at least 10 characters."),
  video_url: z.string().url("Enter a valid video URL.").or(z.literal("")),
  order: z.coerce.number().int("Order must be a whole number.").positive("Order must be at least 1."),
});

const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
});

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required."),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
  new_password_confirmation: z.string().min(8, "Confirm your new password."),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "Passwords do not match.",
  path: ["new_password_confirmation"],
});

const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
  new_password_confirmation: z.string().min(8, "Confirm your new password."),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "Passwords do not match.",
  path: ["new_password_confirmation"],
});

const roleLabel = (role?: Role) => (role === "instructor" ? "Instructor" : "Student");

const toFieldErrors = (error: z.ZodError): FieldErrors =>
  error.issues.reduce<FieldErrors>((acc, issue) => {
    const key = String(issue.path[0] ?? "form");
    acc[key] = issue.message;
    return acc;
  }, {});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const findMessage = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = findMessage(item);
      if (message) {
        return message;
      }
    }
  }

  if (isRecord(value)) {
    for (const key of ["detail", "non_field_errors", "error", "message"]) {
      const message = findMessage(value[key]);
      if (message) {
        return message;
      }
    }

    for (const item of Object.values(value)) {
      const message = findMessage(item);
      if (message) {
        return message;
      }
    }
  }

  return null;
};

const getErrorMessage = (error: unknown) => {
  if (isRecord(error)) {
    const direct = findMessage(error.data);
    if (direct) {
      return direct;
    }

    if (typeof error.error === "string") {
      return error.error;
    }
  }

  return "Something went wrong. Please try again.";
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const getYoutubeEmbedUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url);
    let videoId = "";

    if (parsedUrl.hostname.includes("youtu.be")) {
      videoId = parsedUrl.pathname.slice(1);
    } else if (parsedUrl.hostname.includes("youtube.com")) {
      videoId = parsedUrl.searchParams.get("v") ?? "";

      if (!videoId && parsedUrl.pathname.startsWith("/embed/")) {
        videoId = parsedUrl.pathname.replace("/embed/", "");
      }
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch {
    return "";
  }
};

const useCurrentUser = () => useSelector((state: RootState) => state.auth.user);

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-sm text-red-600">{message}</p>;
}

function ErrorBanner({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {getErrorMessage(error)}
    </div>
  );
}

function LoadingBlock({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-line bg-white dark:bg-slate-800 dark:border-slate-700 p-6 text-sm text-slate-600 dark:text-slate-400 shadow-sm">
      <div className="h-2 w-28 animate-pulse rounded-full bg-mint/30" />
      <p className="mt-3">{label}</p>
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-50/50 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-md shadow-indigo-100/30 flex flex-col h-full font-sans animate-pulse">
      <div className="h-44 w-full bg-slate-200 dark:bg-slate-700" />
      <div className="p-6 flex flex-col flex-1">
        <div className="flex-1">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-6 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md mt-3" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
        </div>
        <div className="flex items-center gap-3 border-t border-indigo-50/50 dark:border-slate-700/50 pt-4 mt-5 mb-4">
          <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div className="flex gap-2.5">
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex-1" />
          <div className="h-9 bg-slate-200 dark:bg-slate-700 rounded-full flex-1" />
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 py-2">
        <div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
          <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
        <div>
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-md mb-2 ml-1" />
          <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      </div>
      <div className="h-12 w-32 bg-slate-200 dark:bg-slate-700 rounded-full" />
    </div>
  );
}

function LessonListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-4 p-3 pr-6 rounded-full border border-indigo-50/50 dark:border-slate-700/50">
          <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded-md" />
            <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CourseDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start animate-pulse">
      <div className="space-y-8">
        <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 sm:p-8 lg:p-10 shadow-xl shadow-indigo-100/20">
          <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-8 w-3/4 bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded-md mt-4" />
          <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-md mt-2" />
        </div>
        <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-xl shadow-indigo-100/20">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-md mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex items-center gap-4 p-3 pr-6 rounded-full border border-indigo-50/50 dark:border-slate-700/50">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-indigo-50/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 p-6 shadow-xl shadow-indigo-100/20 flex flex-col gap-6 w-full">
        <div className="h-44 w-full bg-slate-200 dark:bg-slate-700 rounded-2xl" />
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="space-y-4 border-t border-indigo-50 dark:border-slate-700/50 pt-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0" />
              <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-sm text-slate-600 dark:text-slate-400 transition-colors duration-300">
      <p className="font-medium text-ink dark:text-slate-200">{title}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function FormInput({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  error,
  icon,
  rightElement,
}: {
  id: string;
  type?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-semibold text-[#3b2c85] dark:text-indigo-300 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-indigo-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-full border bg-white dark:bg-slate-950 py-3.5 pr-12 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 ${
            icon ? "pl-12" : "pl-6"
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/20"
              : "border-indigo-200 dark:border-slate-700 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40"
          }`}
        />
        {rightElement && (
          <div className="absolute right-4 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      <FieldError message={error} />
    </div>
  );
}

function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});

    try {
      const response = await login(parsed.data).unwrap();
      dispatch(setCredentials(response));
      navigate(from, { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <main className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Left Illustration column */}
      <div className="hidden md:flex md:w-1/2 bg-white dark:bg-slate-950 items-center justify-center p-12 select-none border-r border-[#e2e8f0]/40 dark:border-slate-900">
        <div className="flex flex-col items-center max-w-md">
          <img src={loginIllustration} alt="Login Illustration" className="w-full h-auto object-contain max-h-[450px]" />
          <div className="mt-8 text-center">
            <span className="block text-xs font-bold uppercase tracking-widest text-[#a0a5cc] dark:text-indigo-400/50 mb-1">Learn with us</span>
            <span className="block text-2xl md:text-3xl font-extrabold tracking-wide text-sky-500 dark:text-sky-400 font-sans">learn anytime, anywhere</span>
          </div>
        </div>
      </div>

      {/* Right Form column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px] flex flex-col justify-center">
          <div className="text-center mb-4">
            <span className="text-sm font-semibold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase">Welcome to LMS</span>
          </div>

          {/* Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="bg-[#2f2070] dark:bg-slate-900 rounded-full p-1.5 flex w-full max-w-[280px] shadow-inner">
              <Link
                to="/login"
                className="flex-1 text-center py-2.5 text-sm font-semibold rounded-full bg-[#4f20f0] text-white shadow-md transition-all duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2.5 text-sm font-semibold rounded-full text-indigo-200 dark:text-slate-400 hover:text-white transition-all duration-200"
              >
                Register
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white mb-8 text-center md:text-left">Welcome back</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {serverError ? <ErrorBanner error={serverError} /> : null}

            <FormInput
              id="login-email"
              type="email"
              label="Email Address"
              placeholder="Enter your email address"
              value={values.email}
              onChange={(val) => setValues((c) => ({ ...c, email: val }))}
              error={errors.email}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <FormInput
              id="login-password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Enter your Password"
              value={values.password}
              onChange={(val) => setValues((c) => ({ ...c, password: val }))}
              error={errors.password}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between mt-2 select-none">
              <label className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded text-[#4f20f0] border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-[#4f20f0] transition"
                />
                <span className="font-medium">Remember me</span>
              </label>
              <a href="#" className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-[#4f20f0] hover:underline transition">
                Forgot Password ?
              </a>
            </div>

            <div className="flex justify-center sm:justify-end">
              <button
                className="w-full sm:w-auto px-16 py-3.5 mt-8 text-sm font-bold text-white bg-[#4f20f0] rounded-full hover:bg-[#3b1cd9] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg dark:shadow-none"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Signing in..." : "Login"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [values, setValues] = useState({
    full_name: "",
    email: "",
    password: "",
    password_confirmation: "",
    role: "student" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");

    const submitValues = {
      ...values,
      password_confirmation: values.password,
    };

    const parsed = registerSchema.safeParse(submitValues);

    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }

    setErrors({});

    try {
      const response = await registerUser(parsed.data).unwrap();
      dispatch(setCredentials(response as AuthResponse));
      navigate("/", { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <main className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Left Illustration column */}
      <div className="hidden md:flex md:w-1/2 bg-[#45c3b8] dark:bg-slate-900 items-center justify-center p-12 select-none dark:border-r dark:border-slate-800/40">
        <div className="flex flex-col items-center max-w-md">
          <img src={registerIllustration} alt="Register Illustration" className="w-full h-auto object-contain max-h-[450px]" />
        </div>
      </div>

      {/* Right Form column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px] flex flex-col justify-center">
          <div className="text-center mb-4">
            <span className="text-sm font-semibold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase">Welcome to lms</span>
          </div>

          {/* Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="bg-[#2f2070] dark:bg-slate-900 rounded-full p-1.5 flex w-full max-w-[280px] shadow-inner">
              <Link
                to="/login"
                className="flex-1 text-center py-2.5 text-sm font-semibold rounded-full text-indigo-200 dark:text-slate-400 hover:text-white transition-all duration-200"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex-1 text-center py-2.5 text-sm font-semibold rounded-full bg-[#4f20f0] text-white shadow-md transition-all duration-200"
              >
                Register
              </Link>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-[#1e1b4b] dark:text-white mb-8 text-center md:text-left">Create your Account</h1>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {serverError ? <ErrorBanner error={serverError} /> : null}

            <FormInput
              id="register-email"
              type="email"
              label="Email Address"
              placeholder="Enter your Email"
              value={values.email}
              onChange={(val) => setValues((c) => ({ ...c, email: val }))}
              error={errors.email}
              icon={
                <svg className="w-5 h-5 text-indigo-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <FormInput
              id="register-name"
              label="User name"
              placeholder="Enter your User name"
              value={values.full_name}
              onChange={(val) => setValues((c) => ({ ...c, full_name: val }))}
              error={errors.full_name}
              icon={
                <svg className="w-5 h-5 text-indigo-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />

            <div className="flex flex-col">
              <label htmlFor="register-role" className="text-sm font-semibold text-[#3b2c85] dark:text-indigo-300 mb-1.5 ml-1">
                Role
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-4 text-indigo-400 dark:text-slate-500 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <select
                  id="register-role"
                  value={values.role}
                  onChange={(e) => setValues((c) => ({ ...c, role: e.target.value as Role }))}
                  className="w-full rounded-full border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-3.5 pl-12 pr-12 text-sm outline-none transition-all text-slate-800 dark:text-slate-100 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40 font-sans cursor-pointer appearance-none"
                >
                  <option value="student" className="dark:bg-slate-900">Student</option>
                  <option value="instructor" className="dark:bg-slate-900">Instructor</option>
                </select>
                <div className="absolute right-4 text-slate-400 dark:text-slate-500 pointer-events-none">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <FieldError message={errors.role} />
            </div>

            <FormInput
              id="register-password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Enter your Password"
              value={values.password}
              onChange={(val) => setValues((c) => ({ ...c, password: val }))}
              error={errors.password}
              icon={
                <svg className="w-5 h-5 text-indigo-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              }
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 01-1.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              }
            />

            <div className="flex justify-center sm:justify-end">
              <button
                className="w-full sm:w-auto px-16 py-3.5 mt-8 text-sm font-bold text-white bg-[#4f20f0] rounded-full hover:bg-[#3b1cd9] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 shadow-lg dark:shadow-none"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? "Creating account..." : "Register"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const location = useLocation();

  if (!accessToken) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <>{children}</>;
}

function GuestRoute({ children }: { children: ReactNode }) {
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);

  if (accessToken) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}

function RequireRole({ children, role }: { children: ReactNode; role: Role }) {
  const user = useCurrentUser();

  if (!user) {
    return (
      <section className="px-4 py-6 sm:px-6">
        <LoadingBlock label="Loading account..." />
      </section>
    );
  }

  if (user.role !== role) {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}

const renderNavIcon = (label: string) => {
  const baseClass = "w-5 h-5 flex-shrink-0";
  switch (label) {
    case "Dashboard":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
        </svg>
      );
    case "Courses":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    case "My Courses":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      );
    case "Manage Courses":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case "Manage Lessons":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case "Profile":
      return (
        <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    default:
      return null;
  }
};

function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const user = useCurrentUser();
  const { data: profile } = useGetProfileQuery(undefined, { skip: !accessToken });
  const [logoutSession] = useLogoutSessionMutation();

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        return savedTheme === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    if (profile) {
      dispatch(setUser(profile));
    }
  }, [dispatch, profile]);

  const navItems = useMemo(() => {
    const items = [
      { label: "Dashboard", path: "/" },
      { label: "Courses", path: "/courses" },
      { label: "My Courses", path: "/my-courses" },
    ];

    if (user?.role === "instructor") {
      items.splice(
        2,
        1,
        { label: "Manage Courses", path: "/instructor/courses" },
        { label: "Manage Lessons", path: "/instructor/lessons" },
      );
    }

    items.push({ label: "Profile", path: "/profile" });
    return items;
  }, [user?.role]);

  const currentTitle =
    navItems
      .slice()
      .reverse()
      .find((item) => item.path !== "/" && location.pathname.startsWith(item.path))?.label ??
      (location.pathname === "/" ? "Dashboard" : "Course Details");

  const handleLogout = async () => {
    try {
      await logoutSession().unwrap();
    } catch {
      // Local logout still clears the session for this single-page app.
    } finally {
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-ink dark:text-slate-100 font-sans transition-colors duration-300">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-[#e2e8f0] dark:border-slate-800 bg-[#1e1b4b] dark:bg-slate-900 px-6 py-8 md:block flex-shrink-0">
          <Link className="flex items-center gap-2 text-2xl font-black tracking-wider text-white font-header" to="/">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4f20f0] text-white shadow-lg shadow-indigo-500/20 text-lg">
              L
            </span>
            <span>LMS</span>
          </Link>
          <nav className="mt-10 space-y-2">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-full px-5 py-3 text-sm font-bold transition-all duration-200 font-header",
                    isActive
                      ? "bg-[#4f20f0] text-white shadow-lg shadow-[#4f20f0]/30"
                      : "text-indigo-200 dark:text-slate-400 hover:bg-[#2f2070] dark:hover:bg-slate-800 hover:text-white dark:hover:text-white",
                  ].join(" ")
                }
                end={item.path === "/"}
                key={item.path}
                to={item.path}
              >
                {renderNavIcon(item.label)}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 sm:px-8 transition-colors duration-300">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#4f20f0] font-header">Learning Management System</p>
                <h1 className="mt-1 text-2xl font-extrabold text-[#1e1b4b] dark:text-white font-header">{currentTitle}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-indigo-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-slate-800/50 px-4 py-2 text-sm font-semibold text-[#3b2c85] dark:text-indigo-300">
                  {user?.full_name ?? "Account"} - {roleLabel(user?.role)}
                </span>
                
                {/* Dark Mode Toggle Button */}
                <button
                  className="rounded-full border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 active:scale-95 shadow-sm transition-all"
                  onClick={() => setDarkMode(!darkMode)}
                  type="button"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? (
                    <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-5.536a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm1.414 8.486a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zm11.086-1.414a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                    </svg>
                  )}
                </button>

                <button
                  className="rounded-full border border-indigo-100 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-[#4f20f0] hover:text-white dark:hover:bg-[#4f20f0] dark:hover:text-white hover:border-[#4f20f0] dark:hover:border-[#4f20f0] shadow-sm hover:shadow-lg hover:shadow-indigo-100 dark:hover:shadow-none active:scale-[0.98] transition-all font-sans"
                  onClick={handleLogout}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden scrollbar-none">
              {navItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    [
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-all font-header",
                      isActive
                        ? "bg-[#4f20f0] text-white shadow-md shadow-[#4f20f0]/20"
                        : "bg-indigo-50 dark:bg-slate-800 text-[#3b2c85] dark:text-slate-300 hover:bg-indigo-100 dark:hover:bg-slate-700",
                    ].join(" ")
                  }
                  end={item.path === "/"}
                  key={item.path}
                  to={item.path}
                >
                  {renderNavIcon(item.label)}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </header>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

function DashboardPage() {
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

function CourseCard({ course }: { course: Course }) {
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

function CoursesPage() {
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

function CourseDetailsPage() {
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

type CourseFormProps = {
  initialCourse?: Course | null;
  isSaving: boolean;
  onCancel?: () => void;
  onSave: (data: FormData) => Promise<void>;
};

function CourseForm({ initialCourse, isSaving, onCancel, onSave }: CourseFormProps) {
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

function InstructorCoursesPage() {
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

type LessonFormProps = {
  courseId: number;
  initialLesson?: Lesson | null;
  isSaving: boolean;
  onCancel?: () => void;
  onSave: (lesson: Omit<Lesson, "id" | "course_title">) => Promise<void>;
};

function LessonForm({ courseId, initialLesson, isSaving, onCancel, onSave }: LessonFormProps) {
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

function InstructorLessonsPage() {
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

function MyCoursesPage() {
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

function LearningPage() {
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

function ProfilePage() {
  const dispatch = useDispatch<AppDispatch>();
  const { data: profile, error, isLoading } = useGetProfileQuery();
  const [updateProfile, { isLoading: updating }] = useUpdateProfileMutation();
  const [fullName, setFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    setServerError("");
    const parsed = profileSchema.safeParse({ full_name: fullName });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    try {
      const updated = await updateProfile(parsed.data).unwrap();
      dispatch(setUser(updated));
      setFieldErrors({});
      setSaved(true);
    } catch (profileError) {
      setServerError(getErrorMessage(profileError));
    }
  };

  return (
    <section className="space-y-8 px-6 py-8 sm:px-8 max-w-7xl mx-auto font-sans">
      <div className="max-w-2xl rounded-3xl border border-indigo-50/50 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xl shadow-indigo-100/20 dark:shadow-none">
        <h2 className="text-xl font-extrabold text-[#1e1b4b] dark:text-white font-header border-b border-indigo-50 dark:border-slate-800 pb-4 mb-6">Profile</h2>
        <div className="space-y-4">
          {isLoading ? <ProfileSkeleton /> : null}
          {error ? <ErrorBanner error={error} /> : null}
          {serverError ? <ErrorBanner error={serverError} /> : null}
          {saved ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Profile updated.
            </div>
          ) : null}
          {profile ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="text-sm font-semibold text-[#3b2c85] dark:text-indigo-300 mb-1.5 ml-1 block" htmlFor="profile-name">
                  Full Name
                </label>
                <input
                  className="w-full rounded-full border border-indigo-200 dark:border-slate-700 bg-white dark:bg-slate-950 py-3.5 px-6 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 font-sans"
                  id="profile-name"
                  onChange={(event) => setFullName(event.target.value)}
                  value={fullName}
                />
                <FieldError message={fieldErrors.full_name} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 py-2">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-1 ml-1">Email</p>
                  <p className="font-semibold text-[#1e1b4b] dark:text-slate-200 bg-[#f8fafc] dark:bg-slate-950 rounded-full px-6 py-3 border border-indigo-50/50 dark:border-slate-800 text-sm select-all">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mb-1 ml-1">Role</p>
                  <p className="font-semibold text-[#1e1b4b] dark:text-slate-200 bg-[#f8fafc] dark:bg-slate-950 rounded-full px-6 py-3 border border-indigo-50/50 dark:border-slate-800 text-sm">{roleLabel(profile.role)}</p>
                </div>
              </div>
              <button
                className="rounded-full bg-[#4f20f0] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-[#3b1cd9] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 font-sans"
                disabled={updating}
                type="submit"
              >
                {updating ? "Saving..." : "Save profile"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function App() {
  return (
    <Routes>
      <Route
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
        path="/login"
      />
      <Route
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
        path="/register"
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route element={<DashboardPage />} path="/" />
        <Route element={<CoursesPage />} path="/courses" />
        <Route element={<CourseDetailsPage />} path="/courses/:id" />
        <Route element={<MyCoursesPage />} path="/my-courses" />
        <Route element={<LearningPage />} path="/learn/:id" />
        <Route
          element={
            <RequireRole role="instructor">
              <InstructorCoursesPage />
            </RequireRole>
          }
          path="/instructor/courses"
        />
        <Route
          element={
            <RequireRole role="instructor">
              <InstructorLessonsPage />
            </RequireRole>
          }
          path="/instructor/lessons"
        />
        <Route element={<ProfilePage />} path="/profile" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

export default App;

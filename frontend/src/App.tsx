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
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
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
    <div className="rounded-lg border border-line bg-white p-6 text-sm text-slate-600 shadow-sm">
      <div className="h-2 w-28 animate-pulse rounded-full bg-mint/30" />
      <p className="mt-3">{label}</p>
    </div>
  );
}

function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white p-6 text-sm text-slate-600">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-2">{children}</div> : null}
    </div>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-ink">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-mint">LMS</p>
          <h1 className="mt-2 text-2xl font-bold">Learning Management System</h1>
        </div>
        {children}
      </section>
    </main>
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
    <AuthShell>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {serverError ? <ErrorBanner error={serverError} /> : null}
        <div>
          <label className="text-sm font-medium" htmlFor="login-email">
            Email
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="login-email"
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={values.email}
          />
          <FieldError message={errors.email} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="login-password">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="login-password"
            onChange={(event) =>
              setValues((current) => ({ ...current, password: event.target.value }))
            }
            type="password"
            value={values.password}
          />
          <FieldError message={errors.password} />
        </div>
        <button
          className="w-full rounded-md bg-mint px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Need an account?{" "}
        <Link className="font-semibold text-mint hover:underline" to="/register">
          Create one
        </Link>
      </p>
    </AuthShell>
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
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setServerError("");
    const parsed = registerSchema.safeParse(values);

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
    <AuthShell>
      <form className="space-y-4" onSubmit={handleSubmit}>
        {serverError ? <ErrorBanner error={serverError} /> : null}
        <div>
          <label className="text-sm font-medium" htmlFor="register-name">
            Full Name
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="register-name"
            onChange={(event) =>
              setValues((current) => ({ ...current, full_name: event.target.value }))
            }
            value={values.full_name}
          />
          <FieldError message={errors.full_name} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="register-email">
            Email
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="register-email"
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            type="email"
            value={values.email}
          />
          <FieldError message={errors.email} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="register-password">
            Password
          </label>
          <div className="mt-1 flex rounded-md border border-line focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/20">
            <input
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 outline-none"
              id="register-password"
              onChange={(event) =>
                setValues((current) => ({ ...current, password: event.target.value }))
              }
              type={showPassword ? "text" : "password"}
              value={values.password}
            />
            <button
              className="border-l border-line px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setShowPassword((current) => !current)}
              type="button"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <FieldError message={errors.password} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="register-password-confirmation">
            Confirm Password
          </label>
          <div className="mt-1 flex rounded-md border border-line focus-within:border-mint focus-within:ring-2 focus-within:ring-mint/20">
            <input
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 outline-none"
              id="register-password-confirmation"
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  password_confirmation: event.target.value,
                }))
              }
              type={showPasswordConfirmation ? "text" : "password"}
              value={values.password_confirmation}
            />
            <button
              className="border-l border-line px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setShowPasswordConfirmation((current) => !current)}
              type="button"
            >
              {showPasswordConfirmation ? "Hide" : "Show"}
            </button>
          </div>
          <FieldError message={errors.password_confirmation} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="register-role">
            Role
          </label>
          <select
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="register-role"
            onChange={(event) =>
              setValues((current) => ({ ...current, role: event.target.value as Role }))
            }
            value={values.role}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
          </select>
          <FieldError message={errors.role} />
        </div>
        <button
          className="w-full rounded-md bg-mint px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link className="font-semibold text-mint hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
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

function AppLayout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useSelector((state: RootState) => state.auth.accessToken);
  const user = useCurrentUser();
  const { data: profile } = useGetProfileQuery(undefined, { skip: !accessToken });
  const [logoutSession] = useLogoutSessionMutation();

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
    <div className="min-h-screen bg-slate-50 text-ink">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r border-line bg-white px-5 py-6 md:block">
          <Link className="text-xl font-bold" to="/">
            LMS
          </Link>
          <nav className="mt-8 space-y-1">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  [
                    "block rounded-md px-3 py-2 text-sm font-medium",
                    isActive ? "bg-mint text-white" : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")
                }
                end={item.path === "/"}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-line bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-mint">Learning Management System</p>
                <h1 className="mt-1 text-2xl font-bold">{currentTitle}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-line px-3 py-2 text-sm font-medium">
                  {user?.full_name ?? "Account"} - {roleLabel(user?.role)}
                </span>
                <button
                  className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={handleLogout}
                  type="button"
                >
                  Sign out
                </button>
              </div>
            </div>
            <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 md:hidden">
              {navItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    [
                      "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium",
                      isActive ? "bg-mint text-white" : "bg-slate-100 text-slate-700",
                    ].join(" ")
                  }
                  end={item.path === "/"}
                  key={item.path}
                  to={item.path}
                >
                  {item.label}
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
    { label: "Total Courses", value: stats?.total_courses ?? 0 },
    { label: "Total Students", value: stats?.total_students ?? 0 },
    { label: "Total Enrollments", value: stats?.total_enrollments ?? 0 },
    { label: user?.role === "instructor" ? "My Courses" : "Enrolled Courses", value: stats?.my_courses ?? 0 },
  ];

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6">
      {statsError ? <ErrorBanner error={statsError} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm" key={stat.label}>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold">{statsLoading ? "..." : stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {user?.role === "instructor" ? "My Course Activity" : "Available Courses"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {user?.role === "instructor"
                ? `${stats?.my_enrollments ?? 0} enrollments across your courses`
                : "Browse and continue learning"}
            </p>
          </div>
          <Link
            className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90"
            to={user?.role === "instructor" ? "/instructor/courses" : "/courses"}
          >
            {user?.role === "instructor" ? "+ New Course" : "Browse Courses"}
          </Link>
        </div>

        <div className="mt-5">
          {coursesLoading ? (
            <LoadingBlock />
          ) : courses.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
      {course.thumbnail_url ? (
        <img alt={course.title} className="h-36 w-full object-cover" src={course.thumbnail_url} />
      ) : (
        <div className="flex h-36 items-center justify-center bg-slate-100 text-4xl font-bold text-mint">
          {course.title.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="space-y-4 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coral">
            {course.category.name}
          </p>
          <h3 className="mt-1 text-lg font-semibold">{course.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-slate-600">{course.description}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>{course.lessons_count} lessons</span>
          <span>{course.enrollments_count} enrolled</span>
          <span>By {course.instructor.full_name}</span>
        </div>
        {error ? <ErrorBanner error={error} /> : null}
        <div className="flex flex-wrap gap-2">
          <Link
            className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-100"
            to={`/courses/${course.id}`}
          >
            View
          </Link>
          {user?.role === "student" && learned ? (
            <Link
              className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-mint/90"
              to={`/learn/${course.id}`}
            >
              Learn
            </Link>
          ) : null}
          {user?.role === "student" && !learned ? (
            <button
              className="rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
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
    <section className="space-y-5 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Course Catalog</h2>
          <p className="mt-1 text-sm text-slate-500">{courses.length} courses found</p>
        </div>
        <input
          className="w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20 sm:max-w-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search courses"
          value={search}
        />
      </div>

      {error ? <ErrorBanner error={error} /> : null}
      {isLoading ? (
        <LoadingBlock />
      ) : courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
      <section className="px-4 py-6 sm:px-6">
        <LoadingBlock />
      </section>
    );
  }

  if (error || !course) {
    return (
      <section className="px-4 py-6 sm:px-6">
        <ErrorBanner error={error ?? "Course not found."} />
      </section>
    );
  }

  return (
    <section className="space-y-6 px-4 py-6 sm:px-6">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {course.thumbnail_url ? (
          <img alt={course.title} className="h-64 w-full object-cover" src={course.thumbnail_url} />
        ) : (
          <div className="flex h-48 items-center justify-center bg-slate-100 text-5xl font-bold text-mint">
            {course.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">
              {course.category.name}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{course.title}</h2>
            <p className="mt-3 text-slate-600">{course.description}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            <span>Instructor: {course.instructor.full_name}</span>
            <span>{course.lessons_count} lessons</span>
            <span>{course.enrollments_count} enrollments</span>
            <span>Created {formatDate(course.created_at)}</span>
          </div>
          {enrollError ? <ErrorBanner error={enrollError} /> : null}
          {user?.role === "student" && !course.is_enrolled ? (
            <button
              className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={enrolling}
              onClick={handleEnroll}
              type="button"
            >
              {enrolling ? "Enrolling..." : "Enroll in course"}
            </button>
          ) : null}
          {user?.role === "student" && course.is_enrolled ? (
            <Link
              className="inline-flex rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90"
              to={`/learn/${course.id}`}
            >
              Start learning
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Lessons</h3>
        {!canAccessLessons ? (
          <p className="mt-3 text-sm text-slate-600">Enroll in this course to access lessons.</p>
        ) : lessonsLoading ? (
          <div className="mt-4">
            <LoadingBlock />
          </div>
        ) : lessons.length ? (
          <div className="mt-4 divide-y divide-line">
            {lessons.map((lesson) => (
              <div className="py-3" key={lesson.id}>
                <p className="font-semibold">
                  {lesson.order}. {lesson.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{lesson.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState title="No lessons have been added yet." />
          </div>
        )}
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
          <label className="text-sm font-medium" htmlFor="course-title">
            Title
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="course-title"
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            value={values.title}
          />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="course-category">
            Category
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
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
        <label className="text-sm font-medium" htmlFor="course-description">
          Description
        </label>
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
          id="course-description"
          onChange={(event) =>
            setValues((current) => ({ ...current, description: event.target.value }))
          }
          value={values.description}
        />
        <FieldError message={errors.description} />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="course-thumbnail">
          Thumbnail
        </label>
        <input
          accept="image/*"
          className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm"
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
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : initialCourse ? "Update course" : "Create course"}
        </button>
        {onCancel ? (
          <button
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-slate-100"
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
    <section className="space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{editing ? "Edit Course" : "Create Course"}</h2>
        <div className="mt-4">
          <CourseForm
            initialCourse={editing}
            isSaving={creating || updating}
            key={editing?.id ?? "new-course"}
            onCancel={editing ? () => setEditing(null) : undefined}
            onSave={handleSave}
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">My Courses</h2>
        <div className="mt-4 space-y-3">
          {error ? <ErrorBanner error={error} /> : null}
          {deleteError ? <ErrorBanner error={deleteError} /> : null}
          {isLoading ? (
            <LoadingBlock />
          ) : courses.length ? (
            courses.map((course) => (
              <div
                className="flex flex-col gap-3 rounded-md border border-line p-4 lg:flex-row lg:items-center lg:justify-between"
                key={course.id}
              >
                <div>
                  <p className="font-semibold">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.category.name} - {course.lessons_count} lessons -{" "}
                    {course.enrollments_count} enrollments
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                    to={`/courses/${course.id}`}
                  >
                    View
                  </Link>
                  <button
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                    onClick={() => setEditing(course)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md bg-coral px-3 py-2 text-sm font-semibold text-white hover:bg-coral/90"
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
          <label className="text-sm font-medium" htmlFor="lesson-title">
            Title
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
            id="lesson-title"
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            value={values.title}
          />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="lesson-order">
            Order
          </label>
          <input
            className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
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
        <label className="text-sm font-medium" htmlFor="lesson-video">
          Video URL
        </label>
        <input
          className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
          id="lesson-video"
          onChange={(event) =>
            setValues((current) => ({ ...current, video_url: event.target.value }))
          }
          value={values.video_url}
        />
        <FieldError message={errors.video_url} />
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="lesson-content">
          Content
        </label>
        <textarea
          className="mt-1 min-h-28 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
          id="lesson-content"
          onChange={(event) =>
            setValues((current) => ({ ...current, content: event.target.value }))
          }
          value={values.content}
        />
        <FieldError message={errors.content} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          type="submit"
        >
          {isSaving ? "Saving..." : initialLesson ? "Update lesson" : "Create lesson"}
        </button>
        {onCancel ? (
          <button
            className="rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-slate-100"
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
    <section className="space-y-6 px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold">Manage Lessons</h2>
          <select
            className="rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
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

        <div className="mt-5">
          {coursesLoading ? (
            <LoadingBlock />
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
              <Link className="font-semibold text-mint hover:underline" to="/instructor/courses">
                Go to course management
              </Link>
            </EmptyState>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Lessons</h2>
        <div className="mt-4 space-y-3">
          {error ? <ErrorBanner error={error} /> : null}
          {deleteError ? <ErrorBanner error={deleteError} /> : null}
          {isLoading ? (
            <LoadingBlock />
          ) : lessons.length ? (
            lessons.map((lesson) => (
              <div
                className="flex flex-col gap-3 rounded-md border border-line p-4 lg:flex-row lg:items-center lg:justify-between"
                key={lesson.id}
              >
                <div>
                  <p className="font-semibold">
                    {lesson.order}. {lesson.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{lesson.course_title}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-100"
                    onClick={() => setEditing(lesson)}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md bg-coral px-3 py-2 text-sm font-semibold text-white hover:bg-coral/90"
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
    <section className="space-y-5 px-4 py-6 sm:px-6">
      {error ? <ErrorBanner error={error} /> : null}
      {isLoading ? (
        <LoadingBlock />
      ) : courses.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard course={course} key={course.id} />
          ))}
        </div>
      ) : (
        <EmptyState title="No enrolled courses yet.">
          <Link className="font-semibold text-mint hover:underline" to="/courses">
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

  useEffect(() => {
    if (lessons.length && !lessons.some((lesson) => lesson.id === activeLessonId)) {
      setActiveLessonId(lessons[0].id);
    }
  }, [activeLessonId, lessons]);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];

  if (courseLoading) {
    return (
      <section className="px-4 py-6 sm:px-6">
        <LoadingBlock />
      </section>
    );
  }

  if (courseError || !course) {
    return (
      <section className="px-4 py-6 sm:px-6">
        <ErrorBanner error={courseError ?? "Course not found."} />
      </section>
    );
  }

  if (!canAccess) {
    return (
      <section className="px-4 py-6 sm:px-6">
        <EmptyState title="You are not enrolled in this course.">
          <Link className="font-semibold text-mint hover:underline" to={`/courses/${course.id}`}>
            View course
          </Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="grid gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-line bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">{course.title}</h2>
        <div className="mt-4 space-y-2">
          {lessonsError ? <ErrorBanner error={lessonsError} /> : null}
          {lessonsLoading ? (
            <LoadingBlock />
          ) : lessons.length ? (
            lessons.map((lesson) => (
              <button
                className={[
                  "w-full rounded-md px-3 py-2 text-left text-sm font-medium",
                  activeLesson?.id === lesson.id
                    ? "bg-mint text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                ].join(" ")}
                key={lesson.id}
                onClick={() => setActiveLessonId(lesson.id)}
                type="button"
              >
                {lesson.order}. {lesson.title}
              </button>
            ))
          ) : (
            <EmptyState title="No lessons available." />
          )}
        </div>
      </aside>

      <article className="rounded-lg border border-line bg-white p-5 shadow-sm">
        {activeLesson ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">
              Lesson {activeLesson.order}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{activeLesson.title}</h2>
            {activeLesson.video_url ? (
              <a
                className="mt-4 inline-flex rounded-md border border-line px-4 py-2 text-sm font-semibold hover:bg-slate-100"
                href={activeLesson.video_url}
                rel="noreferrer"
                target="_blank"
              >
                Open video
              </a>
            ) : null}
            <p className="mt-5 whitespace-pre-line leading-7 text-slate-700">{activeLesson.content}</p>
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
    <section className="px-4 py-6 sm:px-6">
      <div className="max-w-2xl rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="mt-4 space-y-4">
          {isLoading ? <LoadingBlock /> : null}
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
                <label className="text-sm font-medium" htmlFor="profile-name">
                  Full Name
                </label>
                <input
                  className="mt-1 w-full rounded-md border border-line px-3 py-2 outline-none focus:border-mint focus:ring-2 focus:ring-mint/20"
                  id="profile-name"
                  onChange={(event) => setFullName(event.target.value)}
                  value={fullName}
                />
                <FieldError message={fieldErrors.full_name} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="mt-1 font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="mt-1 font-medium">{roleLabel(profile.role)}</p>
                </div>
              </div>
              <button
                className="rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-mint/90 disabled:cursor-not-allowed disabled:opacity-60"
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

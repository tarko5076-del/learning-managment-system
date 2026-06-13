import { baseApi } from "./baseApi";
import type {
  AuthResponse,
  Category,
  Course,
  DashboardStats,
  Enrollment,
  Lesson,
  LessonProgress,
  Role,
  User,
} from "../types";

type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role: Role;
};

type LoginPayload = {
  email: string;
  password: string;
};

type CourseListArgs = {
  search?: string;
  mine?: boolean;
  category?: string;
  instructor?: string;
  ordering?: "newest" | "oldest" | "most_enrolled" | "title";
};

type LessonListArgs = {
  course?: number | string;
};

export const lmsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<AuthResponse, RegisterPayload>({
      query: (body) => ({
        url: "auth/register",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Dashboard"],
    }),
    login: builder.mutation<AuthResponse, LoginPayload>({
      query: (body) => ({
        url: "auth/login",
        method: "POST",
        body,
      }),
    }),
    logoutSession: builder.mutation<void, void>({
      query: () => ({
        url: "auth/logout",
        method: "POST",
      }),
    }),
    getProfile: builder.query<User, void>({
      query: () => "auth/profile",
      providesTags: ["Profile"],
    }),
    updateProfile: builder.mutation<User, Pick<User, "full_name">>({
      query: (body) => ({
        url: "auth/profile",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Profile"],
    }),
    changePassword: builder.mutation<
      { detail: string },
      {
        current_password: string;
        new_password: string;
        new_password_confirmation: string;
      }
    >({
      query: (body) => ({
        url: "auth/change-password",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<
      { detail: string },
      {
        email: string;
        new_password: string;
        new_password_confirmation: string;
      }
    >({
      query: (body) => ({
        url: "auth/reset-password",
        method: "POST",
        body,
      }),
    }),
    getDashboard: builder.query<DashboardStats, void>({
      query: () => "dashboard",
      providesTags: ["Dashboard"],
    }),
    getCategories: builder.query<Category[], void>({
      query: () => "categories",
      providesTags: ["Categories"],
    }),
    createCategory: builder.mutation<Category, { name: string }>({
      query: (body) => ({
        url: "categories",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: builder.mutation<Category, { id: number; name: string }>({
      query: ({ id, name }) => ({
        url: `categories/${id}`,
        method: "PATCH",
        body: { name },
      }),
      invalidatesTags: ["Categories", "Courses"],
    }),
    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({
        url: `categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
    getInstructors: builder.query<User[], void>({
      query: () => "instructors",
      providesTags: ["Instructors"],
    }),
    getCourses: builder.query<Course[], CourseListArgs | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.search) {
          params.set("search", args.search);
        }
        if (args?.mine) {
          params.set("mine", "true");
        }
        if (args?.category) {
          params.set("category", args.category);
        }
        if (args?.instructor) {
          params.set("instructor", args.instructor);
        }
        if (args?.ordering) {
          params.set("ordering", args.ordering);
        }

        const queryString = params.toString();
        return `courses${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((course) => ({ type: "Courses" as const, id: course.id })),
              { type: "Courses", id: "LIST" },
            ]
          : [{ type: "Courses", id: "LIST" }],
    }),
    getCourse: builder.query<Course, number | string>({
      query: (id) => `courses/${id}`,
      providesTags: (_result, _error, id) => [{ type: "Courses", id }],
    }),
    createCourse: builder.mutation<Course, FormData>({
      query: (body) => ({
        url: "courses",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Courses", "Dashboard", "Categories"],
    }),
    updateCourse: builder.mutation<Course, { id: number; body: FormData }>({
      query: ({ id, body }) => ({
        url: `courses/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Courses", id },
        { type: "Courses", id: "LIST" },
        "Dashboard",
        "Categories",
      ],
    }),
    deleteCourse: builder.mutation<void, number>({
      query: (id) => ({
        url: `courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Courses", "Dashboard"],
    }),
    getLessons: builder.query<Lesson[], LessonListArgs | void>({
      query: (args) => {
        const params = new URLSearchParams();
        if (args?.course) {
          params.set("course", String(args.course));
        }

        const queryString = params.toString();
        return `lessons${queryString ? `?${queryString}` : ""}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map((lesson) => ({ type: "Lessons" as const, id: lesson.id })),
              { type: "Lessons", id: "LIST" },
            ]
          : [{ type: "Lessons", id: "LIST" }],
    }),
    createLesson: builder.mutation<Lesson, Omit<Lesson, "id" | "course_title">>({
      query: (body) => ({
        url: "lessons",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Lessons", "Courses", "Dashboard"],
    }),
    updateLesson: builder.mutation<Lesson, { id: number; body: Omit<Lesson, "id" | "course_title"> }>({
      query: ({ id, body }) => ({
        url: `lessons/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Lessons", id },
        { type: "Lessons", id: "LIST" },
        "Courses",
      ],
    }),
    deleteLesson: builder.mutation<void, number>({
      query: (id) => ({
        url: `lessons/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Lessons", "Courses"],
    }),
    updateLessonProgress: builder.mutation<
      LessonProgress,
      { lesson_id: number; completed: boolean }
    >({
      query: (body) => ({
        url: "lesson-progress",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Progress", "Lessons", "Courses", "MyCourses", "Dashboard"],
    }),
    enroll: builder.mutation<Enrollment, { course_id: number }>({
      query: (body) => ({
        url: "enrollments",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Courses", "Dashboard", "MyCourses", "Lessons"],
    }),
    getMyCourses: builder.query<Course[], void>({
      query: () => "my-courses",
      providesTags: ["MyCourses"],
    }),
  }),
});

export const {
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
} = lmsApi;

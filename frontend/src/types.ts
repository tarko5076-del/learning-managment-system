export type Role = "student" | "instructor";

export type User = {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
};

export type UserSummary = Pick<User, "id" | "full_name" | "email" | "role">;

export type AuthResponse = {
  access: string;
  refresh: string;
  user: User;
};

export type Category = {
  id: number;
  name: string;
};

export type Course = {
  id: number;
  title: string;
  description: string;
  thumbnail: string | null;
  thumbnail_url: string;
  category: Category;
  instructor: UserSummary;
  created_at: string;
  updated_at: string;
  lessons_count: number;
  enrollments_count: number;
  is_enrolled: boolean;
  progress_percentage: number;
};

export type Lesson = {
  id: number;
  course: number;
  course_title: string;
  title: string;
  content: string;
  video_url: string;
  order: number;
  is_completed: boolean;
  completed_at: string | null;
};

export type Enrollment = {
  id: number;
  student: UserSummary;
  course: Course;
  enrollment_date: string;
};

export type DashboardStats = {
  total_courses: number;
  total_students: number;
  total_enrollments: number;
  my_courses: number;
  my_enrollments: number;
};

export type LessonProgress = {
  id: number;
  lesson: Lesson;
  completed: boolean;
  completed_at: string | null;
  updated_at: string;
};

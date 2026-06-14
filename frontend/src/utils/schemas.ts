import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z.object({
  full_name: z.string().min(2, "User name must be at least 2 characters."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  password_confirmation: z.string().min(8, "Confirm your password."),
  role: z.enum(["student", "instructor"]),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords do not match.",
  path: ["password_confirmation"],
});

export const courseSchema = z.object({
  title: z.string().min(3, "Course title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  category_name: z.string().min(2, "Category is required."),
});

export const lessonSchema = z.object({
  title: z.string().min(3, "Lesson title must be at least 3 characters."),
  content: z.string().min(10, "Lesson content must be at least 10 characters."),
  video_url: z.string().url("Enter a valid video URL.").or(z.literal("")),
  order: z.coerce.number().int("Order must be a whole number.").positive("Order must be at least 1."),
});

export const profileSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters."),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters."),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required."),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
  new_password_confirmation: z.string().min(8, "Confirm your new password."),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "Passwords do not match.",
  path: ["new_password_confirmation"],
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  new_password: z.string().min(8, "New password must be at least 8 characters."),
  new_password_confirmation: z.string().min(8, "Confirm your new password."),
}).refine((data) => data.new_password === data.new_password_confirmation, {
  message: "Passwords do not match.",
  path: ["new_password_confirmation"],
});

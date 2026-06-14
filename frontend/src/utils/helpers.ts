import { z } from "zod";
import type { Role } from "../types";

export type FieldErrors = Record<string, string>;

export const roleLabel = (role?: Role) => (role === "instructor" ? "Instructor" : "Student");

export const toFieldErrors = (error: z.ZodError): FieldErrors =>
  error.issues.reduce<FieldErrors>((acc, issue) => {
    const key = String(issue.path[0] ?? "form");
    acc[key] = issue.message;
    return acc;
  }, {});

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const findMessage = (value: unknown): string | null => {
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

export const getErrorMessage = (error: unknown) => {
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

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));

export const getYoutubeEmbedUrl = (url: string) => {
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

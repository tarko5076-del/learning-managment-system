import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

import { logout, setAccessToken } from "../features/auth/authSlice";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiBaseUrl,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const clearSession = (api: Parameters<BaseQueryFn>[1]) => {
  api.dispatch(logout());
  api.dispatch(baseApi.util.resetApiState());

  if (window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
};

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      clearSession(api);
      return result;
    }

    const refreshResult = await rawBaseQuery(
      {
        url: "auth/refresh",
        method: "POST",
        body: { refresh: refreshToken },
      },
      api,
      extraOptions,
    );

    if (
      refreshResult.data &&
      isRecord(refreshResult.data) &&
      typeof refreshResult.data.access === "string"
    ) {
      api.dispatch(setAccessToken(refreshResult.data.access));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      clearSession(api);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  tagTypes: [
    "Categories",
    "Courses",
    "Dashboard",
    "Instructors",
    "Lessons",
    "MyCourses",
    "Profile",
    "Progress",
  ],
  baseQuery: baseQueryWithReauth,
  endpoints: () => ({}),
});

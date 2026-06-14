import { Navigate, Route, Routes } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { ProtectedRoute } from "./components/routes/ProtectedRoute";
import { GuestRoute } from "./components/routes/GuestRoute";
import { AppLayout } from "./components/layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { CoursesPage } from "./pages/CoursesPage";
import { CourseDetailsPage } from "./pages/CourseDetailsPage";
import { MyCoursesPage } from "./pages/MyCoursesPage";
import { LearningPage } from "./pages/LearningPage";
import { RequireRole } from "./components/routes/RequireRole";
import { InstructorCoursesPage } from "./pages/InstructorCoursesPage";
import { InstructorLessonsPage } from "./pages/InstructorLessonsPage";
import { ProfilePage } from "./pages/ProfilePage";

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

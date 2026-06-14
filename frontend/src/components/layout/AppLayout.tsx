import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../../app/store";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { logout, setUser } from "../../features/auth/authSlice";
import { lmsApi, useGetProfileQuery, useLogoutSessionMutation } from "../../services/lmsApi";
import { roleLabel } from "../../utils/helpers";

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

export function AppLayout() {
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
      dispatch(lmsApi.util.resetApiState());
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

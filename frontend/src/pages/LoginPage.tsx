import { type FormEvent, useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { AppDispatch } from "../app/store";
import { setCredentials } from "../features/auth/authSlice";
import { useLoginMutation } from "../services/lmsApi";
import { loginSchema } from "../utils/schemas";
import { type FieldErrors, getErrorMessage, toFieldErrors } from "../utils/helpers";
import { FormInput } from "../components/ui/FormInput";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import loginImage from "../assets/loginimage.jpg";
import { useTheme } from "../components/ThemeContext";

export function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const location = useLocation();
  const [login, { isLoading }] = useLoginMutation();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { isDark, toggleTheme } = useTheme();

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
    <main className="relative flex min-h-screen bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      {/* Floating Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button
          onClick={toggleTheme}
          className="rounded-full border border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-sm p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 shadow-sm transition-all"
          type="button"
          aria-label="Toggle dark mode"
        >
          {isDark ? (
            <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464-5.536a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464a1 1 0 10-1.414 1.414l.707.707a1 1 0 001.414-1.414l-.707-.707zm1.414 8.486a1 1 0 01-1.414 0l-.707-.707a1 1 0 011.414-1.414l.707.707a1 1 0 010 1.414zm11.086-1.414a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
      {/* Left Illustration column */}
      <div className="hidden md:flex md:w-1/2 bg-white dark:bg-slate-950 items-center justify-center p-12 select-none border-r border-[#e2e8f0]/40 dark:border-slate-900">
        <div className="flex flex-col items-center max-w-md">
          <img src={loginImage} alt="Login Illustration" className="w-full h-auto object-contain max-h-[450px]" />
          <div className="mt-8 text-center">
            <span className="block text-xs font-bold uppercase tracking-widest text-[#a0a5cc] dark:text-indigo-400/50 mb-1">Learn with us</span>
            <span className="block text-2xl md:text-3xl font-extrabold tracking-wide text-sky-500 dark:text-sky-400 font-sans">learn anytime, anywhere</span>
          </div>
        </div>
      </div>

      {/* Right Form column */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-20 bg-white dark:bg-slate-950">
        <div className="w-full max-w-[420px] flex flex-col justify-center">
          <div className="text-center mb-4 flex flex-col items-center">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-slate-900 rounded-full flex items-center justify-center mb-3 shadow-md shadow-indigo-100 dark:shadow-none border border-indigo-100/40 dark:border-slate-800">
              <svg className="w-8 h-8 text-[#4f20f0] dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7" />
              </svg>
            </div>
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

export default LoginPage;

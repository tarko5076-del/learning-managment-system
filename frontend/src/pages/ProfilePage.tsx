import { type FormEvent, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "../app/store";
import { setUser } from "../features/auth/authSlice";
import { useGetProfileQuery, useUpdateProfileMutation } from "../services/lmsApi";
import { ProfileSkeleton } from "../components/skeletons/ProfileSkeleton";
import { FieldError } from "../components/ui/FieldError";
import { ErrorBanner } from "../components/ui/ErrorBanner";
import { profileSchema } from "../utils/schemas";
import { type FieldErrors, getErrorMessage, toFieldErrors, roleLabel } from "../utils/helpers";

export function ProfilePage() {
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

export default ProfilePage;

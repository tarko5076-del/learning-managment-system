import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { LoadingBlock } from "../ui/LoadingBlock";
import type { Role } from "../../types";

export function RequireRole({ children, role }: { children: ReactNode; role: Role }) {
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

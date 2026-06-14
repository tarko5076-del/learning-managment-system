import { useSelector } from "react-redux";
import type { RootState } from "../app/store";

export const useCurrentUser = () => useSelector((state: RootState) => state.auth.user);

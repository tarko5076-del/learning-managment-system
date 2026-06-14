import React from "react";
import { FieldError } from "./FieldError";

export function FormInput({
  id,
  type = "text",
  label,
  placeholder,
  value,
  onChange,
  error,
  icon,
  rightElement,
}: {
  id: string;
  type?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="text-sm font-semibold text-[#3b2c85] dark:text-indigo-300 mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-4 text-indigo-400 dark:text-slate-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-full border bg-white dark:bg-slate-950 py-3.5 pr-12 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 ${
            icon ? "pl-12" : "pl-6"
          } ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:focus:ring-red-950/20"
              : "border-indigo-200 dark:border-slate-700 focus:border-[#4f20f0] focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/40"
          }`}
        />
        {rightElement && (
          <div className="absolute right-4 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      <FieldError message={error} />
    </div>
  );
}

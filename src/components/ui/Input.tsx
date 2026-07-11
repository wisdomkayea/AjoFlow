import { InputHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={clsx(
        "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink",
        "placeholder:text-ink/35 focus:outline-none focus:ring-2 focus:ring-forest-300 focus:border-forest-400",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-wide text-ink/50 mb-1.5">
      {children}
    </label>
  );
}

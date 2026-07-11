import { HTMLAttributes } from "react";
import clsx from "clsx";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-[linear-gradient(110deg,rgba(220,215,201,0.45),rgba(255,255,255,0.85),rgba(220,215,201,0.45))]",
        "bg-[length:200%_100%] [animation-duration:1.5s] [animation-name:shimmer] [animation-iteration-count:infinite]",
        className
      )}
      {...props}
    />
  );
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={clsx("h-3", index === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

import { Bell } from "lucide-react";

export function TopNav({ title, name }: { title: string; name: string }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 hidden items-center justify-between bg-primary-600 px-8 py-4 md:flex">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-primary-600 hover:bg-white/90"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-primary-600">
            {initial}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500" />
        </div>
      </div>
    </header>
  );
}

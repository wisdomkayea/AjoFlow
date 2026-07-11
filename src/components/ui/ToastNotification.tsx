"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { resolveError } from "@/lib/notification-errors";
import { AlertModal } from "@/components/ui/AlertModal";

type ToastTone = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface NotificationContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  presentError: (error: unknown, fallback: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-forest-300 bg-forest-50 text-forest-900",
  error: "border-clay/40 bg-[#FFF1EC] text-[#6E2E1A]",
  warning: "border-gold-400/50 bg-[#FFF8E8] text-[#6B4F08]",
  info: "border-line bg-white text-ink"
};

function toneIcon(tone: ToastTone) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "error") return <AlertCircle className="h-4 w-4" />;
  if (tone === "warning") return <TriangleAlert className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertState, setAlertState] = useState<{ open: boolean; title: string; message: string }>({
    open: false,
    title: "",
    message: ""
  });

  const pushToast = useCallback((message: string, tone: ToastTone) => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    setToasts((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const presentError = useCallback(
    (error: unknown, fallback: string) => {
      const resolved = resolveError(error, fallback);

      if (resolved.isMinor) {
        setAlertState({
          open: true,
          title: "Please check this",
          message: resolved.message
        });
        return;
      }

      pushToast(resolved.message, "error");
    },
    [pushToast]
  );

  const contextValue = useMemo<NotificationContextType>(
    () => ({
      success: (message: string) => pushToast(message, "success"),
      error: (message: string) => pushToast(message, "error"),
      warning: (message: string) => pushToast(message, "warning"),
      info: (message: string) => pushToast(message, "info"),
      presentError
    }),
    [presentError, pushToast]
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto toast-enter flex items-start gap-2 rounded-md border px-3 py-2 shadow-card ${toneClasses[toast.tone]}`}
            role="status"
            aria-live="polite"
          >
            <span className="mt-0.5 shrink-0">{toneIcon(toast.tone)}</span>
            <p className="text-sm leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="ml-auto rounded p-0.5 opacity-70 transition hover:opacity-100"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <AlertModal
        open={alertState.open}
        title={alertState.title}
        message={alertState.message}
        onClose={() => setAlertState({ open: false, title: "", message: "" })}
      />
    </NotificationContext.Provider>
  );
}

export function useNotifier() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifier must be used inside NotificationProvider");
  }
  return context;
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function AlertModal({ open, title, message, onClose }: AlertModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/30 px-4" role="dialog" aria-modal="true" aria-labelledby="alert-modal-title">
      <Card className="w-full max-w-md p-6">
        <h2 id="alert-modal-title" className="font-display text-xl text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink/70">{message}</p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Okay</Button>
        </div>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { NotificationProvider } from "@/components/ui/ToastNotification";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kreddt — Contribution groups & installments, tracked transparently",
  description:
    "Kreddt digitizes Ajo/Esusu contribution groups and vendor installment plans so every naira is accounted for.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F3F4F6] font-body antialiased">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { NotificationProvider } from "@/components/ui/ToastNotification";
import "./globals.css";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"]
});

export const metadata: Metadata = {
  title: "AjoFlow — Contribution groups & installments, tracked transparently",
  description:
    "AjoFlow digitizes Ajo/Esusu contribution groups and vendor installment plans so every naira is accounted for."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={notoSans.variable}>
      <body className="font-body bg-canvas min-h-screen antialiased">
        <NotificationProvider>{children}</NotificationProvider>
      </body>
    </html>
  );
}

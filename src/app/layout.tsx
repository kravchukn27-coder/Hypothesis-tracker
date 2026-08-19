import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NavLinks } from "./NavLinks";
import { ToastProvider } from "@/components/toast/ToastProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hypothesis Tracker",
  description: "Growth hypothesis backlog, experiments, and calendar",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-zinc-900">
        <ToastProvider>
          <header className="border-b border-zinc-200">
            {/* Matches Calendar's max-w-[1600px] (the widest page
                container in the app) so the header's left edge lines up
                with page content on every screen instead of floating
                centered in its own narrower column. */}
            <div className="mx-auto flex max-w-[1600px] items-center gap-8 px-6 py-3">
              <span className="text-lg font-semibold tracking-tight text-zinc-900">
                Hypothesis Tracker
              </span>
              <NavLinks />
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}

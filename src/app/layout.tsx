import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeOps Inbox — Drop the paperwork. Get the next actions.",
  description: "Turn bills, travel confirmations, and official notices into evidence-backed execution plans—privately in your browser.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

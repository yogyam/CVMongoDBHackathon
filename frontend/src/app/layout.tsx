import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syntropy Protocol - Autonomous Freelance Mediation",
  description: "Multi-agent coordination for freelance projects",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

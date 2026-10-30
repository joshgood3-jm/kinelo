import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinelo — Rank Your Movies",
  description: "Pairwise movie ranking, social lists, and personalized recommendations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

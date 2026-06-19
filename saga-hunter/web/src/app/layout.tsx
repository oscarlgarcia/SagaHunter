import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SagaHunter",
  description: "Story Discovery Engine — Find and develop narrative-worthy stories",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

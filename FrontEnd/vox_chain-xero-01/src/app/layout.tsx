import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxChain",
  description: "A place for secure, decentralised voting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

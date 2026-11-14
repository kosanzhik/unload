import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { BatchProvider } from "@/lib/store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UNLOAD — Less listing. More living.",
  description:
    "Turn a pile of unused things into organized, ready-to-copy resale listing drafts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <BatchProvider>{children}</BatchProvider>
      </body>
    </html>
  );
}

import { Suspense } from "react";
import { AppShell } from "@/components/chrome";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Product pages are client-side records (ids from local storage), so the shell
  // reads the URL at runtime and streams in.
  return (
    <Suspense fallback={<div className="min-h-dvh bg-canvas" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

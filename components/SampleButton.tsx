"use client";

import { useRouter } from "next/navigation";
import { useBatch } from "@/lib/store";
import { Button } from "./ui";

export function SampleButton({
  children = "Try with sample items",
  variant = "secondary",
  className,
}: {
  children?: React.ReactNode;
  variant?: "secondary" | "ghost" | "lime" | "primary";
  className?: string;
}) {
  const { loadSample } = useBatch();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      size="lg"
      className={className}
      onClick={() => {
        loadSample();
        router.push("/upload");
      }}
    >
      {children}
    </Button>
  );
}

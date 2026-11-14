"use client";

import { Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useBatch } from "@/lib/store";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/util";
import { AppHeader } from "./chrome";
import { Button, ToastProvider } from "./ui";

export function FlowShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppHeader />
      <div className="flex flex-1 flex-col">{children}</div>
    </ToastProvider>
  );
}

export function PageTitle({ title, sub, aside }: { title: string; sub: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-[28px] leading-tight font-extrabold sm:text-4xl lg:text-[44px]">{title}</h1>
        <p className="mt-2 max-w-2xl text-ink-650 sm:text-lg">{sub}</p>
      </div>
      {aside}
    </div>
  );
}

/** Shown when a flow step is opened without the data it needs. */
export function EmptyBatch({ text = "Add a few photos first, or try the sample batch." }: { text?: string }) {
  const { loadSample, hydrated } = useBatch();
  const router = useRouter();
  if (!hydrated) return <div className="flex-1" />;
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-lime-100">
        <Inbox className="size-6" />
      </span>
      <h2 className="text-2xl font-extrabold">Nothing here yet</h2>
      <p className="mt-2 text-ink-650">{text}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button href="/upload">Add photos</Button>
        <Button
          variant="secondary"
          onClick={() => {
            loadSample();
            router.push("/upload");
          }}
        >
          Use a sample batch
        </Button>
      </div>
    </div>
  );
}

export function Thumb({
  src,
  className,
  alt = "",
}: {
  src?: string;
  className?: string;
  alt?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-[12px] bg-soft", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user photos are data URLs
        <img src={src} alt={alt} className="size-full object-cover" />
      ) : (
        <div className="size-full bg-[repeating-conic-gradient(#eff1e9_0_25%,#f7f8f3_0_50%)] bg-[length:16px_16px]" />
      )}
    </div>
  );
}

export function useItemPhoto() {
  const { photos } = useBatch();
  return (item?: Item) => photos.find((p) => p.id === item?.photoId)?.src;
}

"use client";

import { useEffect, useState } from "react";
import { FileVideo, ImageIcon } from "lucide-react";
import type { Evidence } from "@/lib/core/types";
import { getFile } from "@/lib/evidence";
import { Modal } from "./ui";

export function EvidenceChip({ e }: { e: Evidence }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!open || !e.blobKey) return;
    let u: string | null = null;
    getFile(e.blobKey)
      .then((b) => {
        if (!b) return setMissing(true);
        u = URL.createObjectURL(b);
        setUrl(u);
      })
      .catch(() => setMissing(true));
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [open, e.blobKey]);

  const Icon = e.kind === "video" ? FileVideo : ImageIcon;
  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100">
        <Icon className="size-3.5" /> {e.kind === "video" ? "Video" : "Photo"} evidence
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={e.fileName ?? "Evidence"}>
        {missing && <p className="text-sm text-ink-500">This file is stored on the device where it was uploaded and isn&apos;t available here.</p>}
        {url && e.kind === "video" && <video src={url} controls className="w-full rounded-xl bg-black" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && e.kind === "photo" && <img src={url} alt={e.fileName ?? "Evidence"} className="w-full rounded-xl" />}
        <p className="mt-3 text-xs text-ink-500">
          Shows the item at the time it was recorded ({new Date(e.createdAt).toLocaleString()}). It doesn&apos;t guarantee future condition.
        </p>
      </Modal>
    </>
  );
}

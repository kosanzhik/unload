"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowRight, ImagePlus, Lightbulb, Loader2, Plus, X } from "lucide-react";
import { ActionBar } from "@/components/chrome";
import { FlowShell, PageTitle, Thumb } from "@/components/flow";
import { Button, Card } from "@/components/ui";
import { SAMPLE_PHOTOS } from "@/lib/demo";
import { useBatch } from "@/lib/store";
import { cn, fileToDataUrl, uid } from "@/lib/util";

export default function UploadPage() {
  return (
    <FlowShell>
      <Upload />
    </FlowShell>
  );
}

function Upload() {
  const b = useBatch();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    if (imgs.length < files.length) setError("Some files weren't images and were skipped.");
    try {
      const photos = await Promise.all(
        imgs.map(async (f) => ({ id: uid("p"), name: f.name, src: await fileToDataUrl(f) })),
      );
      b.addPhotos(photos);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that photo. Try a JPG or PNG.");
    }
  }

  async function next() {
    await b.recognize(b.photos, b.recognizedFrom, b.items);
    router.push("/review");
  }

  const has = b.photos.length > 0;

  return (
    <>
      <main className="mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-8 sm:px-6 sm:py-12 grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <section>
          <PageTitle
            title="Start with the things you want to sell."
            sub="Add a few photos. One item or a whole shelf — both work."
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-[20px] border-2 border-dashed bg-surface p-6 text-center transition sm:p-10",
              drag ? "border-ink-900 bg-lime-100" : "border-line",
            )}
          >
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {!has ? (
              <button onClick={() => input.current?.click()} className="mx-auto block py-6">
                <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-lime-400">
                  <ImagePlus className="size-6" />
                </span>
                <span className="block font-display text-lg font-bold">
                  Drag photos here, or <span className="underline underline-offset-4">browse files</span>
                </span>
                <span className="mt-1 block text-sm text-ink-650">
                  Choose clear photos of the items you own.
                </span>
                <span className="mt-3 block text-xs text-ink-450">
                  JPG, PNG or HEIC · one item or a whole shelf per photo
                </span>
              </button>
            ) : (
              <div className="text-left">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-display font-bold">
                    {b.photos.length} photo{b.photos.length > 1 && "s"} added
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
                    <Plus className="size-4" /> Add more
                  </Button>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {b.photos.map((p) => (
                    <li key={p.id} className="group relative">
                      <Thumb src={p.src} alt={p.name} className="aspect-square rounded-[16px]" />
                      <button
                        onClick={() => b.removePhoto(p.id)}
                        aria-label={`Remove ${p.name}`}
                        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                  <li>
                    <button
                      onClick={() => input.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[16px] border border-dashed border-line text-sm font-semibold text-ink-650 hover:border-ink-450"
                    >
                      <Plus className="size-5" /> Add photos
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-error">{error}</p>}
          <p className="mt-4 text-sm text-ink-450">
            You can remove any photo before continuing. Nothing is posted anywhere.
          </p>
        </section>

        <aside className="flex flex-col gap-4 lg:pt-2">
          <Card className="bg-lime-100 p-5">
            <p className="font-display text-lg font-bold">No photos handy?</p>
            <p className="mt-1 text-sm text-ink-650">
              Use our sample batch: a monitor, keyboard, headphones, desk lamp, and a set of books.
            </p>
            <div className="mt-4 flex -space-x-3">
              {SAMPLE_PHOTOS.map((p) => (
                <Thumb key={p.id} src={p.src} className="size-11 rounded-xl border-2 border-lime-100" />
              ))}
            </div>
            <Button variant="primary" className="mt-4 w-full" onClick={b.loadSample}>
              Use a sample batch
            </Button>
          </Card>
          <Card className="p-5">
            <p className="flex items-center gap-2 font-display font-bold">
              <Lightbulb className="size-4" /> Tips for clear photos
            </p>
            <ul className="mt-3 space-y-2 text-sm text-ink-650">
              {[
                "Good light and a plain background",
                "A whole shelf in one photo is fine",
                "Show any wear, scratches, or missing parts",
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-lime-400 ring-2 ring-lime-100" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </main>

      <ActionBar>
        <Button variant="ghost" href="/">
          Back to home
        </Button>
        <Button onClick={next} disabled={!has || b.recognizing} className="min-w-48">
          {b.recognizing ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Looking at your photos…
            </>
          ) : (
            <>
              Continue to review <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </ActionBar>
    </>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SAMPLE_PHOTOS } from "./demo";
import { buildGroups, groupName, makeDraft } from "./plan";
import { recognize } from "./recognize";
import type { Draft, Group, Item, Marketplace, Mode, Photo } from "./types";
import { uid } from "./util";

type State = {
  photos: Photo[];
  items: Item[];
  /** photo ids the current items were recognized from */
  recognizedFrom: string[];
  mode: Mode;
  groups: Group[];
  drafts: Draft[];
  marketplaces: Marketplace[];
};

const EMPTY: State = {
  photos: [],
  items: [],
  recognizedFrom: [],
  mode: "fewer",
  groups: [],
  drafts: [],
  marketplaces: ["Facebook Marketplace"],
};

const KEY = "unload:batch:v1";

function useBatchState() {
  const [state, setState] = useState<State>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [recognizing, setRecognizing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from storage
      if (raw) setState({ ...EMPTY, ...JSON.parse(raw) });
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage full (large photos) — the session still works in memory
    }
  }, [state, hydrated]);

  const patch = useCallback((fn: (s: State) => Partial<State>) => {
    setState((s) => ({ ...s, ...fn(s) }));
  }, []);

  const actions = useMemo(
    () => ({
      reset: () => setState(EMPTY),
      loadSample: () => patch(() => ({ ...EMPTY, photos: SAMPLE_PHOTOS })),
      addPhotos: (photos: Photo[]) => patch((s) => ({ photos: [...s.photos, ...photos] })),
      removePhoto: (id: string) => patch((s) => ({ photos: s.photos.filter((p) => p.id !== id) })),

      /** Recognize photos that haven't been processed yet, keep edits on the rest. */
      recognize: async (photos: Photo[], recognizedFrom: string[], items: Item[]) => {
        const fresh = photos.filter((p) => !recognizedFrom.includes(p.id));
        const keep = items.filter((i) => !i.photoId || photos.some((p) => p.id === i.photoId));
        if (!fresh.length) {
          patch(() => ({ items: keep }));
          return;
        }
        setRecognizing(true);
        try {
          const found = await recognize(fresh);
          patch((s) => ({
            items: [...keep, ...found],
            recognizedFrom: [...s.recognizedFrom, ...fresh.map((p) => p.id)],
          }));
        } finally {
          setRecognizing(false);
        }
      },

      updateItem: (id: string, data: Partial<Item>) =>
        patch((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...data } : i)) })),
      removeItem: (id: string) => patch((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      addItem: () => {
        const item: Item = {
          id: uid("i"),
          name: "New item",
          category: "Other",
          condition: "Good",
          brand: "",
          accessories: "",
          issues: "",
          price: "",
          note: "Added manually",
          confirmed: false,
        };
        patch((s) => ({ items: [...s.items, item] }));
        return item.id;
      },

      setMode: (mode: Mode) => patch((s) => ({ mode, groups: buildGroups(s.items, mode) })),
      planIfNeeded: () =>
        patch((s) => {
          const ids = s.items.map((i) => i.id).sort().join();
          const planned = s.groups.flatMap((g) => g.itemIds).sort().join();
          return ids === planned ? {} : { groups: buildGroups(s.items, s.mode) };
        }),
      renameGroup: (id: string, name: string) =>
        patch((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, name } : g)) })),
      splitGroup: (id: string) =>
        patch((s) => ({
          groups: s.groups.flatMap((g) =>
            g.id !== id
              ? [g]
              : g.itemIds.map((itemId) => ({
                  id: uid("g"),
                  name: s.items.find((i) => i.id === itemId)?.name ?? "Item",
                  itemIds: [itemId],
                })),
          ),
        })),
      acceptPair: (id: string) =>
        patch((s) => ({
          groups: s.groups.map((g) =>
            g.id === id ? { ...g, undecided: false, name: g.name.replace(/\?$/, "") } : g,
          ),
        })),
      /** Move an item into another group, or into its own listing when `to` is null. */
      moveItem: (itemId: string, to: string | null) =>
        patch((s) => {
          let groups = s.groups.map((g) => ({ ...g, itemIds: g.itemIds.filter((i) => i !== itemId) }));
          if (to) {
            groups = groups.map((g) => {
              if (g.id !== to) return g;
              const ids = [...g.itemIds, itemId];
              const its = ids.map((i) => s.items.find((x) => x.id === i)!).filter(Boolean);
              return { ...g, itemIds: ids, name: g.itemIds.length === 1 ? groupName(its) : g.name };
            });
          } else {
            const item = s.items.find((i) => i.id === itemId);
            groups.push({ id: uid("g"), name: item?.name ?? "Item", itemIds: [itemId] });
          }
          groups = groups
            .filter((g) => g.itemIds.length)
            .map((g) =>
              g.itemIds.length === 1
                ? { ...g, undecided: false, name: s.items.find((i) => i.id === g.itemIds[0])!.name }
                : g,
            );
          return { groups };
        }),
      reorderGroup: (id: string, dir: -1 | 1) =>
        patch((s) => {
          const groups = [...s.groups];
          const i = groups.findIndex((g) => g.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= groups.length) return {};
          [groups[i], groups[j]] = [groups[j], groups[i]];
          return { groups };
        }),

      /** Build drafts from the plan, keeping edits for listings whose items didn't change. */
      createDrafts: () =>
        patch((s) => ({
          // an undecided pairing defaults to separate listings
          drafts: s.groups
            .flatMap((g) =>
              g.undecided
                ? g.itemIds.map((id) => ({ id: uid("g"), name: "", itemIds: [id] }))
                : [g],
            )
            .map((g) => {
            const key = g.itemIds.slice().sort().join();
            const existing = s.drafts.find((d) => d.itemIds.slice().sort().join() === key);
            return existing ?? makeDraft(g, s.items);
          }),
        })),
      updateDraft: (id: string, data: Partial<Draft>) =>
        patch((s) => ({ drafts: s.drafts.map((d) => (d.id === id ? { ...d, ...data } : d)) })),
      deleteDraft: (id: string) => patch((s) => ({ drafts: s.drafts.filter((d) => d.id !== id) })),
      toggleMarketplace: (m: Marketplace) =>
        patch((s) => ({
          marketplaces: s.marketplaces.includes(m)
            ? s.marketplaces.filter((x) => x !== m)
            : [...s.marketplaces, m],
        })),
    }),
    [patch],
  );

  return { ...state, hydrated, recognizing, ...actions };
}

type Batch = ReturnType<typeof useBatchState>;
const Ctx = createContext<Batch | null>(null);

export function BatchProvider({ children }: { children: React.ReactNode }) {
  const batch = useBatchState();
  return <Ctx.Provider value={batch}>{children}</Ctx.Provider>;
}

export function useBatch() {
  const b = useContext(Ctx);
  if (!b) throw new Error("useBatch must be used inside BatchProvider");
  return b;
}

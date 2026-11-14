import { SAMPLE_ITEMS } from "./demo";
import type { Item, Photo } from "./types";
import { uid } from "./util";

/**
 * Turns photos into item suggestions.
 *
 * Demo mode: sample photos map to the prepared sample items, user photos become
 * placeholder items the person names themselves on the Review step.
 * TODO: replace the user-photo branch with a call to /api/recognize (Claude vision).
 */
export async function recognize(photos: Photo[]): Promise<Item[]> {
  await new Promise((r) => setTimeout(r, 1200));
  return photos.map((p, i) => {
    const sample = SAMPLE_ITEMS.find((s) => s.photoId === p.id);
    if (sample) return { ...sample };
    return {
      id: uid("i"),
      photoId: p.id,
      name: `Item from photo ${i + 1}`,
      category: "Other",
      condition: "Good",
      brand: "",
      accessories: "",
      issues: "",
      price: "",
      note: "Add a name and details",
      confirmed: false,
    };
  });
}

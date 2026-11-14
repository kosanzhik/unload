import type { Condition, Photo, Product } from "../core/types";
import { uid } from "../util";

/**
 * Demo analysis pipeline — used when Claude vision isn't configured.
 * Known sample photos map to prepared results; any other photo yields an
 * honest blank draft that the seller fills in. Nothing is guessed.
 */

type Draft = Pick<Product, "title" | "description" | "category" | "condition" | "brand" | "model" | "attributes" | "missing" | "sellerQuestions">;

const q = (question: string, why: string, topic: string) => ({ id: uid("q"), question, why, topic });

export const SAMPLES: { id: string; label: string; photos: Photo[]; draft: () => Draft }[] = [
  {
    id: "monitor",
    label: "27-inch monitor",
    photos: [{ id: "s-monitor", src: "/demo/monitor.jpg", name: "monitor.jpg" }],
    draft: () => ({
      title: "27-inch computer monitor with stand",
      description:
        "27-inch flat-screen computer monitor with its original stand. The screen and bezel look clean in the photos. Exact model and ports to be confirmed by the seller.",
      category: "Computers & accessories",
      condition: "Good",
      brand: "",
      model: "",
      attributes: [
        { name: "Screen size", value: "About 27 inches (estimated from photo)" },
        { name: "Stand", value: "Included" },
      ],
      missing: ["Brand and exact model", "Available ports (HDMI, DisplayPort, USB-C)", "Dead or stuck pixels", "Power cable included"],
      sellerQuestions: [
        q("What brand and model is it? (Check the label on the back.)", "Buyers search by model and it settles most spec questions.", "model"),
        q("Is the power cable included?", "The most common question for monitors.", "charger"),
        q("Any dead pixels, scratches, or backlight issues?", "Photos can't show screen defects.", "dead pixels"),
      ],
    }),
  },
  {
    id: "headphones",
    label: "Over-ear headphones",
    photos: [{ id: "s-headphones", src: "/demo/headphones.jpg", name: "headphones.jpg" }],
    draft: () => ({
      title: "Over-ear wireless headphones",
      description: "Over-ear headphones with cushioned ear cups. Light visible wear on the headband. Functionality to be confirmed by the seller.",
      category: "Audio",
      condition: "Fair",
      brand: "",
      model: "",
      attributes: [{ name: "Type", value: "Over-ear" }],
      missing: ["Brand and model", "Battery life", "Bluetooth pairing works", "Charging cable included"],
      sellerQuestions: [
        q("Do both sides play sound clearly and does Bluetooth pair?", "Functionality isn't visible in photos.", "works"),
        q("How long does the battery last now?", "Battery wear is a top concern for used headphones.", "battery"),
        q("Is the charging cable included?", "Affects what the buyer needs to buy separately.", "charger"),
      ],
    }),
  },
  {
    id: "keyboard",
    label: "Mechanical keyboard",
    photos: [{ id: "s-keyboard", src: "/demo/keyboard.jpg", name: "keyboard.jpg" }],
    draft: () => ({
      title: "Mechanical keyboard, white keycaps",
      description: "Full-size mechanical keyboard with white keycaps and a braided cable. Looks clean in the photo. Switch type and working keys to be confirmed.",
      category: "Computers & accessories",
      condition: "Good",
      brand: "",
      model: "",
      attributes: [
        { name: "Layout", value: "Full-size" },
        { name: "Keycaps", value: "White" },
      ],
      missing: ["Switch type", "All keys working", "Brand"],
      sellerQuestions: [
        q("Do all keys register correctly?", "The first thing buyers test.", "keys"),
        q("Which switches does it use (e.g., red, brown, blue)?", "Switch type drives buyer interest.", "keys"),
      ],
    }),
  },
];

export function blankDraft(photoCount: number): Draft {
  return {
    title: "",
    description: "",
    category: "Other",
    condition: "Good" as Condition,
    brand: "",
    model: "",
    attributes: [],
    missing: ["Item name", "Brand and model", "Condition details"],
    sellerQuestions: [
      q("What is this item, and what brand/model is it?", `We couldn't analyze ${photoCount > 1 ? "these photos" : "this photo"} automatically in demo mode.`, "model"),
      q("Does everything work as it should?", "Buyers always ask, and the agent never guesses.", "works"),
      q("Any wear, damage, or missing parts?", "Honest condition prevents disputes later.", "scratches"),
    ],
  };
}


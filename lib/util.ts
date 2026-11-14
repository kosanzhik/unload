export function uid(prefix = "x") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function parsePrice(p: string): number | null {
  const n = Number(p.replace(/[^0-9.]/g, ""));
  return p.trim() && Number.isFinite(n) ? n : null;
}

export function formatMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** Downscale an image file to a JPEG data URL so it fits in sessionStorage. */
export function fileToDataUrl(file: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Couldn't read ${file.name}`));
    };
    img.src = url;
  });
}

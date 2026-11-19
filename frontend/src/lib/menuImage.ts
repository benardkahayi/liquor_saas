import { API_BASE_URL } from "../api/client";

// Address of a menu item's photo, or null when it has none. The ?v= part
// changes whenever the photo changes, so the browser can cache each version.
export function menuImageUrl(item: { id: string; imageUpdatedAt?: string | null }): string | null {
  if (!item.imageUpdatedAt) return null;
  return `${API_BASE_URL}/restaurant/menu/${item.id}/image?v=${new Date(item.imageUpdatedAt).getTime()}`;
}

const MAX_SIDE = 800; // px — sharp on a phone, small to upload
const TARGET_BYTES = 350 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be opened as a photo"));
    };
    img.src = url;
  });
}

// Shrinks a phone photo (often 3–5 MB) to a JPEG of roughly 50–200 KB
// before upload, so it is quick on mobile data and fits the server limit.
export async function resizePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a photo (JPEG, PNG or WebP)");
  }
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not prepare the photo");
  // White behind transparent PNGs, since JPEG has no transparency.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  // base64 is ~4/3 of the real size
  while (dataUrl.length * 0.75 > TARGET_BYTES && quality > 0.45) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

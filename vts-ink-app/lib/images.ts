// Browser-side photo shrinking so uploads stay small (phones shoot 3–12 MB
// photos; hosting platforms cap request bodies around 4.5 MB).

export type UploadItem = { id: string; name: string; blob: Blob; url: string; isPdf: boolean };

const MAX_PDF_BYTES = 2 * 1024 * 1024;

export async function prepareUpload(file: File, maxEdge: number): Promise<UploadItem> {
  const id = `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 8)}`;
  if (file.type === "application/pdf") {
    if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} is over 2 MB`);
    return { id, name: file.name, blob: file, url: "", isPdf: true };
  }
  if (!file.type.startsWith("image/")) throw new Error(`${file.name} isn't an image or PDF`);

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Couldn't read ${file.name}`))), "image/jpeg", 0.8),
  );
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return { id, name, blob, url: URL.createObjectURL(blob), isPdf: false };
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "application/octet-stream";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

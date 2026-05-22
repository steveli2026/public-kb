import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const RASTER_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export function isRasterMime(mime = "") {
  return RASTER_MIME.has(mime.toLowerCase());
}

export async function encodeWebp(buffer, mime = "image/png", { quality = 82 } = {}) {
  const normalized = mime.toLowerCase();
  if (normalized === "image/webp") return { buffer, mime: "image/webp" };
  if (!isRasterMime(normalized)) return { buffer, mime };

  const dir = await mkdtemp(join(tmpdir(), "visual-history-webp-"));
  const inputExt = normalized.includes("jpeg") || normalized.includes("jpg") ? ".jpg" : ".png";
  const input = join(dir, `input${inputExt}`);
  const output = join(dir, "output.webp");

  try {
    await writeFile(input, buffer);
    await execFileAsync("cwebp", ["-quiet", "-mt", "-m", "6", "-q", String(quality), input, "-o", output]);
    return { buffer: await readFile(output), mime: "image/webp" };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export function withWebpExtension(file) {
  const ext = extname(file);
  return ext ? file.slice(0, -ext.length) + ".webp" : `${file}.webp`;
}

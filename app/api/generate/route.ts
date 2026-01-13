import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const PROMPT =
  "Add this helmet to the character, keep original pixels untouched except for the helmet overlay. Ensure the helmet fits the head with correct size & angle.";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const incoming = await req.formData();
    const userImage = incoming.get("image") as File | null;
    const nRaw = incoming.get("n")?.toString() ?? "2";
    const n = Math.max(1, Math.min(4, Number(nRaw) || 2));

    if (!userImage) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Load helmet from /public/assets/helmet.png
    const helmetPath = path.join(process.cwd(), "public", "assets", "helmet.png");
    const helmetBytes = await readFile(helmetPath);
    const helmetBlob = new Blob([helmetBytes], { type: "image/png" });

    const fd = new FormData();
    fd.append("model", "gpt-image-1.5");
    fd.append("prompt", PROMPT);

    // base image + helmet reference
    fd.append("image[]", userImage, userImage.name || "user.png");
    fd.append("image[]", helmetBlob, "helmet.png");

    fd.append("n", String(n));
    fd.append("size", "auto");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: "OpenAI error", detail: errText }, { status: 500 });
    }

    const json = await res.json();
    const images: string[] = (json?.data ?? [])
      .map((d: any) => d?.b64_json)
      .filter(Boolean);

    return NextResponse.json({ images });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

const PROMPT =
  "Add this helmet to the character, keep original pixels untouched except for the helmet overlay. Ensure the helmet fits the head with correct size & angle.";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
    }

    const formData = await req.formData();
    const userImage = formData.get("image") as File | null;
    const n = Math.max(1, Math.min(4, Number(formData.get("n") || 1)));

    if (!userImage) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    // charger le casque
    const helmetPath = path.join(process.cwd(), "public", "assets", "helmet.png");
    const helmetBytes = await readFile(helmetPath);
    const helmetBlob = new Blob([helmetBytes], { type: "image/png" });

    // appeler OpenAI images edits
    const fd = new FormData();
    fd.append("model", "gpt-image-1");
    fd.append("prompt", PROMPT);
    fd.append("image[]", userImage, "user.png");
    fd.append("image[]", helmetBlob, "helmet.png");
    fd.append("n", String(n));
    fd.append("size", "auto");

    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: fd,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: "OpenAI error", detail: text }, { status: 500 });
    }

    const json = await res.json();
    const imagesB64: string[] = (json.data || [])
      .map((d: any) => d?.b64_json)
      .filter(Boolean);

    const urls: string[] = [];

    for (const b64 of imagesB64) {
      const buffer = Buffer.from(b64, "base64");
      const filename = `gen_${Date.now()}_${Math.random().toString(16).slice(2)}.png`;

      // upload blob
      const stored = await put(filename, buffer, {
        access: "public",
        contentType: "image/png",
      });

      urls.push(stored.url);

      // DB: save + increment
      await sql`INSERT INTO generations (image_url) VALUES (${stored.url});`;
      await sql`UPDATE counters SET value = value + 1 WHERE key = 'total_generations';`;
    }

    return NextResponse.json({ images: urls });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

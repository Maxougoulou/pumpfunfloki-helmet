import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(
    1,
    Math.min(48, Number(url.searchParams.get("limit") || "24"))
  );

  const { rows } = await sql`
    SELECT id, image_url, created_at
    FROM generations
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  return NextResponse.json({ items: rows });
}

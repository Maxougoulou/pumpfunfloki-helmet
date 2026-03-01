import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(48, Number(url.searchParams.get("limit") || "24")));

  const { rows } = await sql`
    SELECT id, image_url, created_at
    FROM generations
    ORDER BY created_at DESC
    LIMIT ${limit};
  `;

  const response = NextResponse.json({ items: rows });
  response.headers.set("Access-Control-Allow-Origin", "*");
  return response;
}

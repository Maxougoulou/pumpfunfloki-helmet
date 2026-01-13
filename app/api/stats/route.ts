import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { rows } = await sql`
    SELECT value
    FROM counters
    WHERE key = 'total_generations'
    LIMIT 1;
  `;

  const total = rows?.[0]?.value ?? 0;
  return NextResponse.json({ total: Number(total) });
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    return NextResponse.json({ ok: true, rows: result.rows });
  } catch (err: unknown) {
    const e = err as { message?: string; cause?: { message?: string; code?: string } };
    return NextResponse.json(
      { ok: false, error: e.message, cause: e.cause?.message, code: e.cause?.code },
      { status: 500 },
    );
  }
}

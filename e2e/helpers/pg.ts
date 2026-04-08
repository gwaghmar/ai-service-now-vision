import pg from "pg";

export async function setUserRole(email: string, role: string) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    const r = await c.query(
      `UPDATE "user" SET role = $1 WHERE email = $2`,
      [role, email],
    );
    if (r.rowCount === 0) {
      throw new Error(`No user updated for email ${email}`);
    }
  } finally {
    await c.end();
  }
}

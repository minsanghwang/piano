import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
let db: PGlite;

type Row = Record<string, unknown>;

// Run a query as a logged-in user, the way Supabase does per request.
async function as(uid: string, sql: string, params: unknown[] = []): Promise<Row[]> {
  await db.exec(`set role authenticated; select set_config('test.uid','${uid}',false)`);
  try {
    return (await db.query<Row>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Minimal stand-in for Supabase's auth schema.
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create role authenticated;
    grant usage on schema auth, public to authenticated;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  await db.exec(readFileSync("supabase/migrations/0001_init.sql", "utf8"));
  await db.exec("grant all on all tables in schema public to authenticated");
  await as(A, "insert into tuners (id, name) values ($1, 'A')", [A]);
  await as(B, "insert into tuners (id, name) values ($1, 'B')", [B]);
}, 60_000);

describe("row level security", () => {
  let customerA: string;
  let instrumentA: string;

  it("tuner A can create customer, instrument and service", async () => {
    customerA = (await as(A, "insert into customers (name) values ('Kim') returning id"))[0].id as string;
    instrumentA = (await as(A, "insert into instruments (customer_id) values ($1) returning id", [customerA]))[0]
      .id as string;
    await as(A, "insert into services (instrument_id, visit_date) values ($1, '2026-01-01')", [instrumentA]);
    expect(await as(A, "select * from services")).toHaveLength(1);
  });

  it("tuner B sees nothing of A's data", async () => {
    for (const t of ["customers", "instruments", "services"]) {
      expect(await as(B, `select * from ${t}`)).toHaveLength(0);
    }
  });

  it("tuner B cannot update or delete A's rows", async () => {
    await as(B, "update customers set name = 'x'");
    await as(B, "delete from customers");
    expect((await as(A, "select name from customers"))[0].name).toBe("Kim");
  });

  it("tuner B cannot attach an instrument to A's customer", async () => {
    await expect(as(B, "insert into instruments (customer_id) values ($1)", [customerA])).rejects.toThrow();
  });

  it("tuner B cannot insert rows owned by A", async () => {
    await expect(as(B, "insert into customers (tuner_id, name) values ($1, 'evil')", [A])).rejects.toThrow();
  });

  it("deleting a customer deletes its history", async () => {
    await as(A, "delete from customers where id = $1", [customerA]);
    for (const t of ["instruments", "services"]) {
      expect(await as(A, `select * from ${t}`)).toHaveLength(0);
    }
  });
});

import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
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
    create role authenticated; create role anon;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  for (const f of readdirSync("supabase/migrations").sort()) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  await db.exec("grant all on all tables in schema public to authenticated");
}, 60_000);

describe("tuner profile", () => {
  it("is created automatically when a user signs up", async () => {
    const C = "00000000-0000-0000-0000-00000000000c";
    await db.exec(`insert into auth.users values ('${C}')`);
    expect(await as(C, "select id from tuners")).toHaveLength(1);
  });
});

describe("account deletion", () => {
  const D = "00000000-0000-0000-0000-00000000000d";

  it("removes the user and everything they own, and nothing else", async () => {
    await db.exec(`insert into auth.users values ('${D}')`);
    const c = (await as(D, "insert into customers (name) values ('Del') returning id"))[0].id as string;
    const i = (await as(D, "insert into instruments (customer_id) values ($1) returning id", [c]))[0].id as string;
    await as(D, "insert into services (instrument_id, visit_date) values ($1, '2026-01-01')", [i]);
    await as(D, "insert into reminder_logs (instrument_id) values ($1)", [i]);
    await as(D, "insert into availability_rules (weekday, start_time, end_time) values (1,'09:00','12:00')");
    await db.exec(
      `insert into booking_requests (tuner_id, name, phone, requested_at) values ('${D}','x','12345', now() + interval '1 day')`,
    );
    const before = (await db.query<Row>("select count(*)::int n from customers")).rows[0].n as number;

    await as(D, "select delete_my_account()");

    for (const t of ["customers", "instruments", "services", "reminder_logs", "availability_rules", "booking_requests"]) {
      const n = (await db.query<Row>(`select count(*)::int n from ${t} where tuner_id = '${D}'`)).rows[0].n;
      expect(n, t).toBe(0);
    }
    expect((await db.query<Row>(`select count(*)::int n from auth.users where id = '${D}'`)).rows[0].n).toBe(0);
    expect((await db.query<Row>(`select count(*)::int n from tuners where id = '${D}'`)).rows[0].n).toBe(0);
    // other tuners are untouched
    expect((await db.query<Row>("select count(*)::int n from tuners")).rows[0].n as number).toBeGreaterThanOrEqual(2);
    expect((await db.query<Row>("select count(*)::int n from customers")).rows[0].n as number).toBe(before - 1);
  });

  it("can only be called by a signed-in user", async () => {
    await db.exec("set role anon");
    try {
      await expect(db.query("select delete_my_account()")).rejects.toThrow();
    } finally {
      await db.exec("reset role");
    }
    // authenticated role without a user id (no JWT subject) is refused too
    await expect(as("", "select delete_my_account()")).rejects.toThrow();
  });
});

describe("row level security", () => {
  let customerA: string;
  let instrumentA: string;

  it("tuner A can create customer, instrument and service", async () => {
    customerA = (await as(A, "insert into customers (name) values ('Kim') returning id"))[0].id as string;
    instrumentA = (await as(A, "insert into instruments (customer_id) values ($1) returning id", [customerA]))[0]
      .id as string;
    await as(A, "insert into services (instrument_id, visit_date) values ($1, '2026-01-01')", [instrumentA]);
    expect(await as(A, "select * from services")).toHaveLength(1);
    await as(A, "insert into reminder_logs (instrument_id) values ($1)", [instrumentA]);
  });

  it("tuner B sees nothing of A's data", async () => {
    for (const t of ["customers", "instruments", "services", "reminder_logs"]) {
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
    for (const t of ["instruments", "services", "reminder_logs"]) {
      expect(await as(A, `select * from ${t}`)).toHaveLength(0);
    }
  });
});

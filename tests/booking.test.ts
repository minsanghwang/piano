import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
let db: PGlite;
let slug: string;
type Row = Record<string, unknown>;

async function as(role: "anon" | "authenticated", uid: string, sql: string, params: unknown[] = []): Promise<Row[]> {
  await db.exec(`set role ${role}; select set_config('test.uid','${uid}',false)`);
  try {
    return (await db.query<Row>(sql, params)).rows;
  } finally {
    await db.exec("reset role");
  }
}
const anon = (sql: string, params: unknown[] = []) => as("anon", "", sql, params);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    create role authenticated; create role anon;
    grant usage on schema auth, public to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
    insert into auth.users values ('${A}'), ('${B}');
  `);
  for (const f of readdirSync("supabase/migrations").sort()) {
    await db.exec(readFileSync(`supabase/migrations/${f}`, "utf8"));
  }
  await db.exec("grant all on all tables in schema public to authenticated");
  slug = (await as("authenticated", A, "select booking_slug from tuners"))[0].booking_slug as string;
  // Every day 09:00-13:00 => two 2-hour slots per day.
  for (let d = 0; d < 7; d++) {
    await as("authenticated", A, "insert into availability_rules (weekday, start_time, end_time) values ($1,'09:00','13:00')", [d]);
  }
}, 60_000);

describe("public booking", () => {
  it("slug is long and unguessable", () => {
    expect(slug).toMatch(/^[0-9a-f]{32}$/);
  });

  it("anonymous visitor sees open slots only for a valid slug", async () => {
    const slots = await anon("select * from public_open_slots($1)", [slug]);
    expect(slots.length).toBeGreaterThanOrEqual(28); // ~15 days x 2, minus the 12h window
    expect(await anon("select * from public_open_slots('nope')")).toHaveLength(0);
  });

  it("anonymous visitor cannot read or write tables directly", async () => {
    await expect(anon("select * from booking_requests")).rejects.toThrow();
    await expect(anon("select * from tuners")).rejects.toThrow();
    await expect(
      anon("insert into booking_requests (tuner_id,name,phone,requested_at) values ($1,'x','12345',now())", [A]),
    ).rejects.toThrow();
  });

  it("books a slot once; second booking of the same slot fails", async () => {
    const slot = (await anon("select slot from public_open_slots($1) limit 1", [slug]))[0].slot as Date;
    await anon("select create_booking_request($1,'홍길동','010-1234-5678','', $2)", [slug, slot]);
    await expect(anon("select create_booking_request($1,'다른이','010-0000-0000','', $2)", [slug, slot])).rejects.toThrow();
    const remaining = await anon("select slot from public_open_slots($1)", [slug]);
    expect(remaining.some((r) => +(r.slot as Date) === +slot)).toBe(false);
  });

  it("rejects times that are not offered", async () => {
    await expect(
      anon("select create_booking_request($1,'x','010-1111-2222','', now() + interval '3 days 7 minutes')", [slug]),
    ).rejects.toThrow();
  });

  it("only the owning tuner sees the request and can accept it", async () => {
    expect(await as("authenticated", B, "select * from booking_requests", [])).toHaveLength(0);
    await as("authenticated", B, "update booking_requests set status='accepted'");
    expect((await as("authenticated", A, "select status from booking_requests"))[0].status).toBe("requested");
    await as("authenticated", A, "update booking_requests set status='accepted'");
    expect((await as("authenticated", A, "select status from booking_requests"))[0].status).toBe("accepted");
  });

  it("tuner cannot forge a request by direct insert", async () => {
    await expect(
      as("authenticated", A, "insert into booking_requests (tuner_id,name,phone,requested_at) values ($1,'x','12345',now())", [A]),
    ).rejects.toThrow();
  });

  it("declining frees the slot again", async () => {
    await as("authenticated", A, "update booking_requests set status='declined'");
    const slot = (await as("authenticated", A, "select requested_at from booking_requests"))[0].requested_at as Date;
    const open = await anon("select slot from public_open_slots($1)", [slug]);
    expect(open.some((r) => +(r.slot as Date) === +slot)).toBe(true);
  });

  it("exception days are not offered", async () => {
    const first = (await anon("select slot from public_open_slots($1) limit 1", [slug]))[0].slot as Date;
    const day = first.toLocaleDateString("sv", { timeZone: "Asia/Seoul" });
    await as("authenticated", A, "insert into availability_exceptions (day) values ($1)", [day]);
    const open = await anon("select slot from public_open_slots($1)", [slug]);
    expect(open.every((r) => (r.slot as Date).toLocaleDateString("sv", { timeZone: "Asia/Seoul" }) !== day)).toBe(true);
  });

  it("limits requests per hour", async () => {
    let failed = false;
    for (let i = 0; i < 12; i++) {
      try {
        await anon("select create_booking_request($1,'s','010-9999-0000','', (select slot from public_open_slots($1) limit 1))", [slug]);
      } catch {
        failed = true;
        break;
      }
    }
    expect(failed).toBe(true);
  });
});

// Largest value a Postgres INTEGER (Prisma Int) column can hold.
const MAX_INT_ID = 2147483647;

// Parses a route/body ID. Returns null for anything that is not a
// positive integer that fits the database column, so callers can
// respond 400 instead of letting Prisma throw (which surfaces as 500).
export function parseId(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0 || id > MAX_INT_ID) {
    return null;
  }

  return id;
}

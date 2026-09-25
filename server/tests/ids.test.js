import { describe, it, expect } from "vitest";

import { parseId } from "../lib/ids.js";

describe("parseId", () => {
  it.each([
    ["1", 1],
    ["42", 42],
    [7, 7],
    ["2147483647", 2147483647],
  ])("accepts %j", (value, expected) => {
    expect(parseId(value)).toBe(expected);
  });

  it.each([
    "abc",
    "",
    "0",
    "-1",
    "1.5",
    "2147483648",
    "99999999999",
    "Infinity",
    "NaN",
    null,
    undefined,
    true,
    {},
    [],
    [1],
  ])("rejects %j", (value) => {
    expect(parseId(value)).toBeNull();
  });
});

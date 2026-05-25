declare module "node:assert/strict" {
  export function deepEqual(actual: unknown, expected: unknown): void;
  export function equal(actual: unknown, expected: unknown): void;
  export function ok(value: unknown): asserts value;
  export function throws(action: () => void, expected?: RegExp): void;
}

declare module "node:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void): void;
}

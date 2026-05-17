#!/usr/bin/env bun
/**
 * Personal Amazon order-history extractor (v2 — less friction).
 *
 * RUN BY A HUMAN-actor, NOT BY OTTO.
 * Otto can't scrape your authenticated Amazon session per the safety
 * classifier (B-0582 destructive-verb gate working as designed). You
 * running this script is the legitimate path — your code, your auth,
 * your data, your file.
 *
 * What's new in v2 (vs v1):
 *   - Auto-installs missing playwright + chromium on first run (no manual prereqs)
 *   - Session persistence — after first login, subsequent runs reuse the
 *     cookies and skip the login step entirely
 *   - Predictable output location: ~/.local/share/zeta-inventory/amazon/<year>/
 *     (no need to remember where you ran from)
 *   - Default year = current year (no arg needed for the common case)
 *
 * Outputs (in ~/.local/share/zeta-inventory/amazon/<year>/):
 *   amazon-orders-full.json
 *     — titles + prices + dates per order (for accountant; never to git)
 *   amazon-orders-hardware-filtered.json
 *     — hardware-keyword subset (review then optionally commit to B-0590)
 *
 * Usage (after first run that auto-installs):
 *     bun tools/inventory/amazon-orders-extract.ts          # current year
 *     bun tools/inventory/amazon-orders-extract.ts 2024     # specific year
 *
 * The browser opens headed. First run: log in. Subsequent runs: skip login.
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HARDWARE_KEYWORDS =
  /\b(Beelink|Minisforum|GMKtec|ASUS\s+NUC|Intel\s+NUC|Framework|Mini.?PC|GPU|Graphics\s+Card|NVIDIA|GeForce|Radeon|Ryzen|Intel\s+Core|Core\s+Ultra|NPU|AI\s+CPU|OCuLink|Thunderbolt|PCIe|DDR\d|RAM\s+\d|SSD|NVMe|M\.2|HDD|switch|router|ethernet|network|KVM|PiKVM|JetKVM|Tinypilot|Comet\s+Pro|Lantronix|monitor|display|UPS|rack|server|NAS|workstation|motherboard|CPU|processor|cooler|fan|PSU|power\s+supply|case|chassis|cable|adapter|hub|dock|usb)\b/i;

const YEAR = process.argv[2] ?? new Date().getFullYear().toString();
const BASE_URL = `https://www.amazon.com/your-orders/orders?timeFilter=year-${YEAR}`;
const ORDER_SELECTOR = ".order-card, .js-order-card, [data-component='OrderCard']";
const DATA_ROOT = join(homedir(), ".local/share/zeta-inventory/amazon");
const SESSION_FILE = join(DATA_ROOT, "playwright-session.json");
const YEAR_DIR = join(DATA_ROOT, YEAR);
const FULL_OUT = join(YEAR_DIR, "amazon-orders-full.json");
const HARDWARE_OUT = join(YEAR_DIR, "amazon-orders-hardware-filtered.json");

interface Order {
  page: number;
  date: string | null;
  orderTotal: string | null;
  items: string[];
}

// ────────────────────────────────────────────────────────────────────
// First-run deps auto-install
// ────────────────────────────────────────────────────────────────────

function ensureModule(name: string): boolean {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

function installIfMissing(): void {
  if (!ensureModule("playwright")) {
    console.log("Installing playwright (first-run setup)...");
    const r = spawnSync("bun", ["install", "playwright"], { stdio: "inherit" });
    if (r.status !== 0) {
      console.error("Failed to install playwright. Run manually: bun install playwright");
      process.exit(1);
    }
  }
}

async function ensureChromium(): Promise<void> {
  // Lazy-import after install
  const { chromium } = await import("playwright");
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
  } catch (err) {
    const msg = String(err);
    if (msg.includes("Executable doesn't exist") || msg.includes("Looks like Playwright Test or Playwright was just installed")) {
      console.log("Installing chromium binary (first-run setup)...");
      const r = spawnSync("bunx", ["playwright", "install", "chromium"], { stdio: "inherit" });
      if (r.status !== 0) {
        console.error("Failed to install chromium. Run manually: bunx playwright install chromium");
        process.exit(1);
      }
    } else {
      throw err;
    }
  }
}

// ────────────────────────────────────────────────────────────────────
// Extraction
// ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  installIfMissing();
  await ensureChromium();
  mkdirSync(YEAR_DIR, { recursive: true });

  const { chromium } = await import("playwright");
  console.log(`Extracting Amazon orders for year ${YEAR}...`);
  console.log(`Output directory: ${YEAR_DIR}`);

  const browser = await chromium.launch({ headless: false });
  const sessionOpts = existsSync(SESSION_FILE) ? { storageState: SESSION_FILE } : {};
  const ctx = await browser.newContext(sessionOpts);
  const page = await ctx.newPage();

  await page.goto(BASE_URL);

  // Detect if login is required (sign-in URL contains /ap/signin)
  if (page.url().includes("/ap/signin")) {
    console.log("Sign-in required. Complete login in the opened browser window.");
    console.log("Subsequent runs will skip this step (session is saved).");
    console.log("Waiting up to 5 minutes for sign-in to complete...");
    await page.waitForSelector(ORDER_SELECTOR, { timeout: 5 * 60 * 1000 });
    // Save session so future runs skip login
    await ctx.storageState({ path: SESSION_FILE });
    console.log(`Session saved to ${SESSION_FILE} — future runs will skip login.`);
  } else {
    console.log("Session reused — skipped sign-in.");
    await page.waitForSelector(ORDER_SELECTOR, { timeout: 30_000 });
  }

  const totalPages = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll(".a-pagination li"));
    const numericLabels = items
      .map((li) => li.textContent?.trim() ?? "")
      .filter((t) => /^\d+$/.test(t));
    return numericLabels.length > 0
      ? Math.max(...numericLabels.map(Number))
      : 1;
  });
  console.log(`Detected total pages: ${totalPages}`);

  const allOrders: Order[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
      await page.goto(`${BASE_URL}&startIndex=${(p - 1) * 10}`);
      try {
        await page.waitForSelector(ORDER_SELECTOR, { timeout: 30_000 });
      } catch {
        console.warn(`Page ${p}: no orders rendered within 30s, skipping`);
        continue;
      }
      await page.waitForTimeout(800);
    }
    const orders = await page.evaluate(
      ({ pageNumber, orderSelector }: { pageNumber: number; orderSelector: string }) => {
        const cards = document.querySelectorAll(orderSelector);
        const result: Order[] = [];
        cards.forEach((card) => {
          const text = card.textContent ?? "";
          const dateMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/);
          const totalMatch = text.match(/\$[\d,]+\.\d{2}/);
          const itemLinks = card.querySelectorAll("a[href*='/dp/'], a[href*='/gp/product/']");
          const items: string[] = [];
          itemLinks.forEach((a) => {
            const t = (a.textContent ?? "").trim();
            if (
              t.length > 5 &&
              t.length < 300 &&
              !t.match(/^(Buy it again|Track package|Order details|View invoice|Return|Replace|Write a|Get product support|Archive order)/i)
            ) {
              items.push(t);
            }
          });
          if (items.length > 0) {
            result.push({
              page: pageNumber,
              date: dateMatch ? dateMatch[0] : null,
              orderTotal: totalMatch ? totalMatch[0] : null,
              items: [...new Set(items)],
            });
          }
        });
        return result;
      },
      { pageNumber: p, orderSelector: ORDER_SELECTOR },
    );
    console.log(`Page ${p}: ${orders.length} orders`);
    allOrders.push(...orders);
  }

  // Refresh session state on every successful run (cookies rotate)
  await ctx.storageState({ path: SESSION_FILE });

  writeFileSync(
    FULL_OUT,
    JSON.stringify({ year: YEAR, totalPages, orderCount: allOrders.length, orders: allOrders }, null, 2),
  );
  console.log(`\nWrote ${FULL_OUT} — ${allOrders.length} orders`);

  const hardwareOrders = allOrders
    .map((o) => ({ ...o, items: o.items.filter((i) => HARDWARE_KEYWORDS.test(i)) }))
    .filter((o) => o.items.length > 0);
  writeFileSync(
    HARDWARE_OUT,
    JSON.stringify({ year: YEAR, orderCount: hardwareOrders.length, orders: hardwareOrders }, null, 2),
  );
  console.log(`Wrote ${HARDWARE_OUT} — ${hardwareOrders.length} hardware-matching orders`);

  await browser.close();
  console.log("\nDone. Review the hardware-filtered file before any git commit.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

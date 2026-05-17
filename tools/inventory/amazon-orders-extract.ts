#!/usr/bin/env bun
/**
 * Personal Amazon order-history extractor (v2.2).
 *
 * RUN BY HUMAN, NOT BY OTTO. Per B-0582 destructive-verb-refusal-gate.
 *
 * v2.2 changes vs v2.1:
 *   - Container-agnostic extraction: instead of finding `.order-card`
 *     containers (Amazon's selectors change; v1+v2 found 0 orders for
 *     Aaron 2026-05-16), find every `/dp/` link directly + walk up the
 *     DOM tree to find an ancestor containing a date/price pattern.
 *     Robust against selector drift.
 *   - Per-item records (instead of per-order grouping) — each item is
 *     one row with title + nearest date + nearest price ancestor data.
 *
 * v2.1 features retained:
 *   - Auto-installs playwright + chromium on first run
 *   - Session persistence — subsequent runs skip login
 *   - Output: ~/.local/share/zeta-inventory/amazon/<year>/
 *   - Default year = current year
 *   - Press-Enter pause after browser opens (keeps browser open until
 *     user confirms — sidesteps any wait-for-selector timing issue)
 *   - Verbose error logging
 *
 * Usage:
 *     bun /tmp/amazon-orders-extract.ts          # current year
 *     bun /tmp/amazon-orders-extract.ts 2024     # specific year
 */

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";

const HARDWARE_KEYWORDS =
  /\b(Beelink|Minisforum|GMKtec|ASUS\s+NUC|Intel\s+NUC|Framework|Mini.?PC|GPU|Graphics\s+Card|NVIDIA|GeForce|Radeon|Ryzen|Intel\s+Core|Core\s+Ultra|NPU|AI\s+CPU|OCuLink|Thunderbolt|PCIe|DDR\d|RAM\s+\d|SSD|NVMe|M\.2|HDD|switch|router|ethernet|network|KVM|PiKVM|JetKVM|Tinypilot|Comet\s+Pro|Lantronix|monitor|display|UPS|rack|server|NAS|workstation|motherboard|CPU|processor|cooler|fan|PSU|power\s+supply|case|chassis|cable|adapter|hub|dock|usb)\b/i;

const YEAR = process.argv[2] ?? new Date().getFullYear().toString();
const BASE_URL = `https://www.amazon.com/your-orders/orders?timeFilter=year-${YEAR}`;
const DATA_ROOT = join(homedir(), ".local/share/zeta-inventory/amazon");
const SESSION_FILE = join(DATA_ROOT, "playwright-session.json");
const YEAR_DIR = join(DATA_ROOT, YEAR);
const FULL_OUT = join(YEAR_DIR, "amazon-items-full.json");
const HARDWARE_OUT = join(YEAR_DIR, "amazon-items-hardware-filtered.json");

interface Item {
  page: number;
  title: string;
  url: string;
  date: string | null;
  nearbyPrice: string | null;
}

// ────────────────────────────────────────────────────────────────────
// First-run deps auto-install
// ────────────────────────────────────────────────────────────────────

function ensureModule(name: string): boolean {
  try { require.resolve(name); return true; } catch { return false; }
}

function installIfMissing(): void {
  if (!ensureModule("playwright")) {
    console.log("Installing playwright (first-run setup)...");
    const r = spawnSync("bun", ["install", "playwright"], { stdio: "inherit" });
    if (r.status !== 0) { console.error("Failed. Run manually: bun install playwright"); process.exit(1); }
  }
}

async function ensureChromium(): Promise<void> {
  const { chromium } = await import("playwright");
  try {
    const b = await chromium.launch({ headless: true });
    await b.close();
  } catch (err) {
    const msg = String(err);
    if (msg.includes("Executable doesn't exist") || msg.includes("Looks like Playwright Test or Playwright was just installed")) {
      console.log("Installing chromium binary (first-run setup)...");
      const r = spawnSync("bunx", ["playwright", "install", "chromium"], { stdio: "inherit" });
      if (r.status !== 0) { console.error("Failed. Run manually: bunx playwright install chromium"); process.exit(1); }
    } else { throw err; }
  }
}

// ────────────────────────────────────────────────────────────────────
// Press-Enter pause (browser stays open until user confirms)
// ────────────────────────────────────────────────────────────────────

async function pressEnterToContinue(prompt: string): Promise<void> {
  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(prompt);
  console.log("Press ENTER in this terminal when you're ready to continue.");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
    process.stdin.resume();
  });
  process.stdin.pause();
}

// ────────────────────────────────────────────────────────────────────
// Main
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

  try {
    await page.goto(BASE_URL);
  } catch (err) {
    console.error(`goto(${BASE_URL}) failed:`, err);
    await pressEnterToContinue("Press Enter to close the browser and exit.");
    await browser.close();
    process.exit(1);
  }

  // Press-Enter pause — let user log in + verify orders are loaded.
  await pressEnterToContinue(
    `Amazon orders page is open in the browser.\n` +
      (existsSync(SESSION_FILE)
        ? "Session was reused. Verify you can see your orders, then press Enter."
        : "If sign-in is required, complete it in the browser. Verify you can see your orders. Then press Enter."),
  );

  // Save session for next run (whether reused or fresh login)
  await ctx.storageState({ path: SESSION_FILE });

  // Detect pagination — try multiple patterns
  const totalPages = await page.evaluate(() => {
    const pagiItems = Array.from(document.querySelectorAll(".a-pagination li, ul.a-pagination li, [aria-label*='pagination'] li"));
    const numbers = pagiItems.map((li) => li.textContent?.trim() ?? "").filter((t) => /^\d+$/.test(t));
    return numbers.length > 0 ? Math.max(...numbers.map(Number)) : 1;
  });
  console.log(`Detected total pages: ${totalPages}`);
  if (totalPages === 1) {
    console.log("Warning: only 1 page detected. If you expected more, pagination detection may have failed.");
    console.log("Will still try to extract items from the current page.");
  }

  const allItems: Item[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p > 1) {
      try {
        await page.goto(`${BASE_URL}&startIndex=${(p - 1) * 10}`);
        await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
        await page.waitForTimeout(1500); // give JS render extra time
      } catch (err) {
        console.warn(`Page ${p} navigation failed: ${String(err).split('\n')[0]} — skipping`);
        continue;
      }
    }
    let items: Item[] = [];
    try {
      items = await page.evaluate(({ pageNumber }: { pageNumber: number }) => {
        const HARDCODED_FALSE_POSITIVE_PREFIXES = /^(Buy it again|Track package|Order details|View invoice|Return|Replace|Write a|Get product support|Archive order|Hide order|Share gift receipt|Leave seller feedback|Track shipment|View your item|Manage|Order summary)/i;
        const allLinks = Array.from(document.querySelectorAll("a[href*='/dp/'], a[href*='/gp/product/']"));
        const seen = new Set<string>();
        const result: Item[] = [];
        allLinks.forEach((a) => {
          const link = a as HTMLAnchorElement;
          const title = (link.textContent ?? "").trim();
          const href = link.href ?? "";
          if (title.length < 5 || title.length > 300) return;
          if (HARDCODED_FALSE_POSITIVE_PREFIXES.test(title)) return;
          // Dedupe by URL — same product link appears multiple times per order card
          const dedup = href.split("?")[0];
          if (seen.has(dedup)) return;
          seen.add(dedup);
          // Walk up ancestors looking for date + price patterns
          let date: string | null = null;
          let price: string | null = null;
          let cur: HTMLElement | null = link.parentElement;
          for (let depth = 0; depth < 10 && cur && (!date || !price); depth++, cur = cur.parentElement) {
            const text = cur.textContent ?? "";
            if (!date) {
              const m = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/);
              if (m) date = m[0];
            }
            if (!price) {
              const m = text.match(/\$[\d,]+\.\d{2}/);
              if (m) price = m[0];
            }
          }
          result.push({ page: pageNumber, title, url: dedup, date, nearbyPrice: price });
        });
        return result;
      }, { pageNumber: p });
    } catch (err) {
      console.warn(`Page ${p} extract failed: ${String(err).split('\n')[0]} — skipping`);
      continue;
    }
    console.log(`Page ${p}: ${items.length} unique items`);
    allItems.push(...items);
  }

  await ctx.storageState({ path: SESSION_FILE });

  writeFileSync(
    FULL_OUT,
    JSON.stringify({ year: YEAR, totalPages, itemCount: allItems.length, items: allItems }, null, 2),
  );
  console.log(`\nWrote ${FULL_OUT} — ${allItems.length} items`);

  const hardwareItems = allItems.filter((i) => HARDWARE_KEYWORDS.test(i.title));
  writeFileSync(
    HARDWARE_OUT,
    JSON.stringify({ year: YEAR, itemCount: hardwareItems.length, items: hardwareItems }, null, 2),
  );
  console.log(`Wrote ${HARDWARE_OUT} — ${hardwareItems.length} hardware-matching items`);

  await browser.close();
  console.log("\nDone. Review the hardware-filtered file before any git commit.");
}

main().catch((err) => {
  console.error("\nUnexpected error:", err);
  process.exit(1);
});

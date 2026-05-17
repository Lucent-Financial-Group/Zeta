#!/usr/bin/env bun
/**
 * Personal Amazon order-history extractor.
 *
 * RUN BY AARON (human-actor), NOT BY OTTO.
 * Otto cannot scrape your authenticated Amazon session per the classifier
 * (B-0582 destructive-verb gate working as designed). You running this
 * script bypasses the agent-as-scraper concern entirely — it's your code,
 * your auth, your data, your file.
 *
 * Uses Playwright in HEADED mode so you log in once interactively in the
 * opened browser window; the script then auto-paginates through all
 * orders for the specified year.
 *
 * Output (both in current working directory):
 *   amazon-orders-full.json
 *     — titles + prices + dates per order (full data for your accountant)
 *   amazon-orders-hardware-filtered.json
 *     — hardware-keyword subset (review then optionally commit to Zeta as
 *       B-0590 hardware inventory substrate)
 *
 * Neither file is for git commit by default. If you put this script in
 * tools/personal/ in Zeta, add these to .gitignore:
 *     amazon-orders-full.json
 *     amazon-orders-hardware-filtered.json
 *
 * Usage:
 *     bun install playwright            # first time only
 *     bunx playwright install chromium  # first time only
 *     bun /tmp/amazon-orders-extract.ts          # extracts 2025 (default)
 *     bun /tmp/amazon-orders-extract.ts 2024     # extracts 2024
 */

import { chromium, type Page } from "playwright";
import { writeFileSync } from "node:fs";

const HARDWARE_KEYWORDS =
  /\b(Beelink|Minisforum|GMKtec|ASUS\s+NUC|Intel\s+NUC|Framework|Mini.?PC|GPU|Graphics\s+Card|NVIDIA|GeForce|Radeon|Ryzen|Intel\s+Core|Core\s+Ultra|NPU|AI\s+CPU|OCuLink|Thunderbolt|PCIe|DDR\d|RAM\s+\d|SSD|NVMe|M\.2|HDD|switch|router|ethernet|network|KVM|PiKVM|JetKVM|Tinypilot|Comet\s+Pro|Lantronix|monitor|display|UPS|rack|server|NAS|workstation|motherboard|CPU|processor|cooler|fan|PSU|power\s+supply|case|chassis|cable|adapter|hub|dock|usb)\b/i;

const YEAR = process.argv[2] ?? "2025";
const BASE_URL = `https://www.amazon.com/your-orders/orders?timeFilter=year-${YEAR}`;
const ORDER_SELECTOR =
  ".order-card, .js-order-card, [data-component='OrderCard']";

interface Order {
  page: number;
  date: string | null;
  orderTotal: string | null;
  items: string[];
}

async function extractCurrentPage(page: Page, pageNumber: number): Promise<Order[]> {
  return await page.evaluate(
    ({ pageNumber, orderSelector }) => {
      const cards = document.querySelectorAll(orderSelector);
      const orders: Order[] = [];
      cards.forEach((card) => {
        const text = card.textContent ?? "";
        const dateMatch = text.match(
          /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/,
        );
        const totalMatch = text.match(/\$[\d,]+\.\d{2}/);
        const itemLinks = card.querySelectorAll(
          "a[href*='/dp/'], a[href*='/gp/product/']",
        );
        const items: string[] = [];
        itemLinks.forEach((a) => {
          const t = (a.textContent ?? "").trim();
          if (
            t.length > 5 &&
            t.length < 300 &&
            !t.match(
              /^(Buy it again|Track package|Order details|View invoice|Return|Replace|Write a|Get product support|Archive order)/i,
            )
          ) {
            items.push(t);
          }
        });
        if (items.length > 0) {
          orders.push({
            page: pageNumber,
            date: dateMatch ? dateMatch[0] : null,
            orderTotal: totalMatch ? totalMatch[0] : null,
            items: [...new Set(items)],
          });
        }
      });
      return orders;
    },
    { pageNumber, orderSelector: ORDER_SELECTOR },
  );
}

async function main(): Promise<void> {
  console.log(`Extracting Amazon orders for year ${YEAR}...`);
  console.log("Launching Playwright (headed). Browser window will open.");

  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(BASE_URL);
  console.log("If sign-in is required, complete it in the opened window.");
  console.log("Waiting up to 5 minutes for orders page to render...");

  await page.waitForSelector(ORDER_SELECTOR, { timeout: 5 * 60 * 1000 });
  console.log("Orders page rendered. Extracting...");

  // Detect total pages from pagination
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
      const startIndex = (p - 1) * 10;
      await page.goto(`${BASE_URL}&startIndex=${startIndex}`);
      try {
        await page.waitForSelector(ORDER_SELECTOR, { timeout: 30_000 });
      } catch {
        console.warn(`Page ${p}: no orders rendered within 30s, skipping`);
        continue;
      }
      await page.waitForTimeout(800); // small politeness delay
    }
    const orders = await extractCurrentPage(page, p);
    console.log(`Page ${p}: ${orders.length} orders`);
    allOrders.push(...orders);
  }

  // Full file (for accountant)
  writeFileSync(
    "amazon-orders-full.json",
    JSON.stringify(
      { year: YEAR, totalPages, orderCount: allOrders.length, orders: allOrders },
      null,
      2,
    ),
  );
  console.log(
    `\nWrote amazon-orders-full.json — ${allOrders.length} orders (give to accountant)`,
  );

  // Hardware-filtered subset (for Zeta substrate review)
  const hardwareOrders = allOrders
    .map((o) => ({ ...o, items: o.items.filter((i) => HARDWARE_KEYWORDS.test(i)) }))
    .filter((o) => o.items.length > 0);
  writeFileSync(
    "amazon-orders-hardware-filtered.json",
    JSON.stringify(
      { year: YEAR, orderCount: hardwareOrders.length, orders: hardwareOrders },
      null,
      2,
    ),
  );
  console.log(
    `Wrote amazon-orders-hardware-filtered.json — ${hardwareOrders.length} orders matching hardware keywords (review before committing)`,
  );

  await browser.close();
  console.log("\nDone. Review the hardware-filtered file before any git commit.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

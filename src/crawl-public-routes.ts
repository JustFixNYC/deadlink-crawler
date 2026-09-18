import { chromium, type Page } from "playwright";
import type { DeadlinkConfig, LinkReference } from "./types.js";

function buildPageUrl(siteUrl: string, locale: string, route: string): string {
  const normalizedRoute = route.startsWith("/") ? route : `/${route}`;
  if (normalizedRoute === "/") {
    return `${siteUrl}/${locale}`;
  }
  return `${siteUrl}/${locale}${normalizedRoute}`;
}

async function extractLinksFromPage(
  page: Page,
  parentPage: string
): Promise<LinkReference[]> {
  const urls = await page.$$eval(
    "a[href], link[href], img[src], source[src], embed[src], iframe[src]",
    (elements) =>
      elements
        .map((el) => {
          const href = el.getAttribute("href");
          const src = el.getAttribute("src");
          return href ?? src;
        })
        .filter((value): value is string => Boolean(value))
  );

  const references: LinkReference[] = [];

  for (const raw of urls) {
    if (
      raw.startsWith("mailto:") ||
      raw.startsWith("tel:") ||
      raw.startsWith("javascript:") ||
      raw.startsWith("#")
    ) {
      continue;
    }

    let url = raw;
    if (raw.startsWith("/")) {
      url = new URL(raw, parentPage).href;
    } else if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
      url = new URL(raw, parentPage).href;
    }

    references.push({
      url,
      parentPage,
      origin: "live",
    });
  }

  return references;
}

export async function crawlPublicRoutes(
  config: DeadlinkConfig
): Promise<LinkReference[]> {
  const browser = await chromium.launch({ headless: true });
  const references: LinkReference[] = [];

  try {
    const page = await browser.newPage();

    for (const locale of config.locales) {
      for (const route of config.publicRoutes) {
        const pageUrl = buildPageUrl(config.siteUrl, locale, route);
        console.log(`Crawling ${pageUrl}`);

        try {
          await page.goto(pageUrl, {
            waitUntil: "networkidle",
            timeout: 60_000,
          });
          const pageLinks = await extractLinksFromPage(page, pageUrl);
          references.push(...pageLinks);
        } catch (error) {
          console.warn(
            `Failed to crawl ${pageUrl}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }
  } finally {
    await browser.close();
  }

  return references;
}

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:4173";
const OUT_DIR = "docs/screenshots";

async function waitForServer(url, maxMs = 45_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // continue
    }
    await delay(500);
  }
  throw new Error(`Dev server did not start in time: ${url}`);
}

function startDevServer() {
  return spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4173"], {
    stdio: "inherit",
    shell: true,
  });
}

async function captureLightUpload(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  await delay(500);
  await page.screenshot({ path: `${OUT_DIR}/upload-light.png` });
  await context.close();
}

async function captureDarkFeatureSet(browser) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
  await context.addInitScript(() => {
    localStorage.setItem("theme", "dark");
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/?demo=1`, { waitUntil: "networkidle" });
  await delay(900);

  await page.screenshot({ path: `${OUT_DIR}/timeline-dark.png` });

  await page.getByRole("tab", { name: /Çelişki Dedektifi/i }).click();
  await delay(500);
  await page.screenshot({ path: `${OUT_DIR}/contradictions-dark.png` });

  await page.getByRole("tab", { name: /İlişki Haritası/i }).click();
  await delay(1400);
  await page.screenshot({ path: `${OUT_DIR}/graph-dark.png` });

  await page.getByRole("tab", { name: /Dava Asistanı/i }).click();
  await delay(700);
  await page.getByRole("textbox", { name: /Mesajınız/i }).fill("Bu davayı kısaca özetle.");
  await page.getByRole("button", { name: /Mesaj gönder/i }).click();
  await delay(3600);
  await page.screenshot({ path: `${OUT_DIR}/chat-dark.png` });

  await context.close();
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const devServer = startDevServer();

  try {
    await waitForServer(BASE_URL);
    const browser = await chromium.launch({ headless: true });
    try {
      await captureLightUpload(browser);
      await captureDarkFeatureSet(browser);
    } finally {
      await browser.close();
    }
  } finally {
    devServer.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

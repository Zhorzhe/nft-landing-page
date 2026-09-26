/**
 * E2E тест (smoke test) на целия сайт в реален браузър.
 *
 * Изисква: работещ сайт с демо данни (SEED_DEMO=1 npm run db:seed) и
 *   npx playwright install chromium   (еднократно)
 *
 * Пускане:  BASE_URL=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
 * Снимки на екрана се записват в ./e2e-output
 *
 * Тестът създава временни записи с уникални имена и изтрива изложителя накрая.
 */
import { chromium } from "playwright";
import ExcelJS from "exceljs";
import sharp from "sharp";
import fs from "node:fs";

const B = process.env.BASE_URL || "http://localhost:3000";
const OUT = process.env.OUT || "e2e-output";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@fair.bg";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe-2026!";
const RUN = Date.now().toString(36).toUpperCase(); // уникален суфикс за това пускане
const NEW_NAME = `Тест Машини ${RUN} ООД`;
const IMPORT_NAME = `Импортирана Фирма ${RUN} ЕООД`;
fs.mkdirSync(OUT, { recursive: true });
const ok = (c, m) => { if (!c) { console.error("FAIL:", m); process.exitCode = 1; } else console.log("ok:", m); };

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

// ---------- Публична част ----------
await page.goto(B + "/bg");
ok((await page.locator("h1").textContent()).includes("изложителите"), "home BG h1");
await page.screenshot({ path: `${OUT}/01-home.png`, fullPage: true });

await page.goto(B + "/bg/exhibitors");
const countText = async () => (await page.locator("aside p.text-lg").first().textContent()).trim();
const before = await countText();
ok(/\d+ изложител/.test(before), "catalog total " + before);
ok((await page.locator("article").count()) > 0, "cards rendered");
await page.screenshot({ path: `${OUT}/02-catalog.png`, fullPage: false });

// филтър по категория (автоматично прилагане)
await page.locator('input[name="category"]').first().check();
await page.waitForURL(/category=/);
await page.waitForTimeout(500);
const afterCat = await countText();
ok(afterCat !== before, `category filter changes count: ${before} -> ${afterCat}`);

// изложение
await page.goto(B + "/bg/exhibitors");
await page.locator('input[name="exhibition"]').nth(1).check();
await page.waitForURL(/exhibition=/);
await page.waitForTimeout(500);
ok((await page.locator("h1").textContent()).includes("Изложители –"), "exhibition title: " + (await page.locator("h1").textContent()));

// търсене
await page.goto(B + "/bg/exhibitors");
await page.fill("#q", "агро");
await page.keyboard.press("Enter");
await page.waitForURL(/q=/);
await page.waitForTimeout(500);
const names = await page.locator("article h2").allTextContents();
ok(names.length > 0 && names.every((n) => /агро/i.test(n)), `search 'агро' -> ${names.length} results`);

// "Изчисти филтрите" нулира чекбоксовете
await page.goto(B + "/bg/exhibitors?category=agriculture");
await page.getByRole("link", { name: "Изчисти филтрите" }).first().click();
await page.waitForURL((u) => !u.search);
await page.waitForTimeout(400);
ok(!(await page.locator('input[name="category"]:checked').count()), "clear filters resets checkboxes");

// буква
await page.goto(B + "/bg/exhibitors?letter=%D0%90");
const letterNames = await page.locator("article h2").allTextContents();
ok(letterNames.every((n) => n.trim().startsWith("А")), "letter А filter");

// детайли
await page.goto(B + "/bg/exhibitors");
await page.locator("article h2 a").first().click();
await page.waitForURL(/\/bg\/exhibitors\/.+/);
ok(await page.getByText("За фирмата").isVisible(), "detail page");
ok((await page.locator('script[type="application/ld+json"]').count()) === 1, "JSON-LD present");
const hreflang = await page.locator('link[rel="alternate"][hreflang="en"]').getAttribute("href");
ok(hreflang && hreflang.includes("/en/exhibitors/"), "hreflang en " + hreflang);
await page.screenshot({ path: `${OUT}/03-detail.png`, fullPage: true });

// смяна на езика запазва страницата
const detailPath = new URL(page.url()).pathname;
await page.getByRole("link", { name: "Switch to English" }).click();
await page.waitForURL(/\/en\/exhibitors\//);
ok(new URL(page.url()).pathname === detailPath.replace("/bg/", "/en/"), "language switch keeps page");
ok(await page.getByText("About the company").isVisible(), "EN detail translated");

// мобилен изглед
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
await m.goto(B + "/bg/exhibitors");
ok(!(await m.locator('input[name="category"]').first().isVisible()), "mobile: filters hidden by default");
await m.getByRole("button", { name: /Покажи филтрите/ }).click();
ok(await m.locator('input[name="category"]').first().isVisible(), "mobile: filters toggle");
const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
ok(!overflow, "mobile: no horizontal scroll");
await m.getByRole("button", { name: /Покажи филтрите/ }).click();
await m.screenshot({ path: `${OUT}/04-mobile.png`, fullPage: false });
await m.goto(B + "/bg/exhibitions/agra-2027");
await m.screenshot({ path: `${OUT}/05-mobile-exhibition.png`, fullPage: false });

// ---------- Админ ----------
await page.goto(B + "/admin/exhibitors");
ok(page.url().includes("/admin/login"), "admin requires login");
await page.fill("#email", ADMIN_EMAIL);
await page.fill("#password", "wrong-password");
await page.click("button[type=submit]");
await page.getByText("Грешен имейл или парола").waitFor();
ok(true, "wrong password rejected");
await page.fill("#password", ADMIN_PASSWORD);
await page.click("button[type=submit]");
await page.waitForURL(B + "/admin");
ok(true, "admin login");
await page.screenshot({ path: `${OUT}/06-admin-dashboard.png`, fullPage: true });

// нов изложител: първо с грешен имейл (стойностите трябва да останат)
const png = await sharp({ create: { width: 2400, height: 1600, channels: 4, background: { r: 30, g: 80, b: 170, alpha: 1 } } })
  .composite([{ input: Buffer.from('<svg width="2400" height="1600"><text x="200" y="900" font-size="500" fill="white">TEST</text></svg>'), top: 0, left: 0 }])
  .png().toBuffer();
fs.writeFileSync(`${OUT}/logo.png`, png);
const huge = await sharp({ create: { width: 2400, height: 1600, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } } }).png({ compressionLevel: 0 }).toBuffer();
fs.writeFileSync(`${OUT}/huge.png`, huge);
await page.goto(B + "/admin/exhibitors/new");
await page.fill('input[name="companyName"]', NEW_NAME);
await page.fill('textarea[name="descriptionBg"]', "Описание на тестовата фирма.");
await page.fill('input[name="website"]', "не е сайт");
await page.setInputFiles('input[name="logo"]', `${OUT}/huge.png`);
await page.locator('input[name="categoryIds"]').first().check();
await page.selectOption('select[aria-label="Добави към изложение"]', { index: 1 });
await page.fill('input[placeholder="B16"]', "Z99");
await page.getByRole("button", { name: "Запази" }).click();
await page.getByText("Невалиден уеб адрес").waitFor();
ok((await page.inputValue('input[name="companyName"]')) === NEW_NAME, "values kept after validation error");
await page.fill('input[name="website"]', "www.test-mashini.bg");
await page.getByRole("button", { name: "Запази" }).click();
await page.getByText("Файлът е по-голям от 8 MB.").first().waitFor();
ok(true, `upload > 8MB rejected (${(huge.length / 1e6).toFixed(1)} MB)`);
ok((await page.inputValue('input[placeholder="B16"]')) === "Z99", "participation kept after error");
await page.fill('input[name="website"]', "www.test-mashini.bg");
await page.fill('input[name="email"]', "office@test-mashini.bg");
await page.setInputFiles('input[name="logo"]', `${OUT}/logo.png`);
await page.getByRole("button", { name: "Запази" }).click();
await page.waitForURL(/\/admin\/exhibitors\/.+\?saved=1/, { timeout: 8000 });
ok(await page.getByText("Промените са запазени").isVisible(), "exhibitor created");
const logoSrc = await page.locator('img[alt="Лого"]').getAttribute("src");
ok(logoSrc.endsWith(".webp"), "logo converted to webp: " + logoSrc);
const logoRes = await page.request.get(B + logoSrc);
const logoBuf = await logoRes.body();
const meta = await sharp(logoBuf).metadata();
ok(meta.width <= 600 && meta.height <= 600, `logo resized ${meta.width}x${meta.height}, ${png.length}B -> ${logoBuf.length}B`);

// публично
await page.goto(B + "/bg/exhibitors?q=" + encodeURIComponent(NEW_NAME));
ok((await page.locator("article h2").allTextContents()).some((n) => n.includes(NEW_NAME)), "new exhibitor visible publicly");
ok(await page.getByText("Z99").isVisible(), "booth shown on card");
await page.screenshot({ path: `${OUT}/07-new-in-catalog.png` });

// ---------- Импорт ----------
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet("x");
ws.addRow(["Име на фирма", "Държава", "Бранш", "Щанд", "Нов изложител", "Уебсайт", "Ненужна колона"]);
ws.addRow([NEW_NAME, "България", "Строителство", "A1", "да", "www.test-mashini.bg", "x"]);
ws.addRow([IMPORT_NAME, "Germany", "Опаковки; Непозната категория", "C7", "", "impfirma.bg", ""]);
// Ред с невалиден уебсайт -> трябва да излезе като грешка
ws.addRow([`Лош Сайт ${RUN} АД`, "BG", "", "", "", "не е сайт", ""]);
await wb.xlsx.writeFile(`${OUT}/import.xlsx`);

await page.goto(B + "/admin/import");
await page.setInputFiles('input[name="file"]', `${OUT}/import.xlsx`);
await page.selectOption("#exhibitionId", { label: "Агра 2027" });
await page.getByRole("button", { name: "1. Провери файла" }).click();
await page.getByText("3 реда:").waitFor();
const summaryBar = await page.locator(".card .border-b.bg-gray-50").first().textContent();
ok(/1 нови/.test(summaryBar) && /1 за обновяване/.test(summaryBar) && /1 с грешки/.test(summaryBar), "preview: " + summaryBar);
ok(await page.getByText("Непозната категория „Непозната категория“").isVisible(), "unknown category warning");
await page.screenshot({ path: `${OUT}/08-import-preview.png`, fullPage: true });
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: /2\. Импортирай/ }).click();
await page.getByText("Импортът приключи").waitFor();
const res = await page.getByText(/^Нови:/).textContent();
ok(/Нови: 1/.test(res) && /Обновени: 1/.test(res) && /С грешка: 1/.test(res), "import result: " + res);

// шаблон
const tpl = await page.request.get(B + "/admin/import-template");
ok(tpl.ok() && tpl.headers()["content-type"].includes("spreadsheetml"), "template download");

// ---------- Роли ----------
await page.goto(B + "/admin/users/new");
await page.fill('input[name="name"]', "Редактор Тест");
await page.fill('input[name="email"]', `editor-${RUN.toLowerCase()}@fair.bg`);
await page.fill('input[name="password"]', "Editor-Pass-2026");
await page.getByRole("button", { name: "Запази" }).click();
await page.waitForURL(/\/admin\/users\?saved=1/);
ok(true, "editor user created");

const ctx2 = await browser.newContext();
const ed = await ctx2.newPage();
await ed.goto(B + "/admin/login");
await ed.fill("#email", `editor-${RUN.toLowerCase()}@fair.bg`);
await ed.fill("#password", "Editor-Pass-2026");
await ed.click("button[type=submit]");
await ed.waitForURL(B + "/admin");
ok(!(await ed.getByRole("link", { name: "Потребители" }).count()), "editor: no users menu");
await ed.goto(B + "/admin/users");
ok(ed.url().includes("denied=1"), "editor: /admin/users denied");
await ed.goto(B + "/admin/exhibitors");
await ed.locator("tbody a").first().click();
await ed.waitForURL(/\/admin\/exhibitors\/.+/);
ok(!(await ed.getByRole("button", { name: "Изтрий" }).count()), "editor: no delete button");
await ed.goto(B + "/admin/exhibitions/new");
ok(ed.url().includes("denied=1"), "editor: cannot create exhibition");

// изтриване като администратор
await page.goto(B + "/admin/exhibitors?q=" + encodeURIComponent(NEW_NAME));
await page.locator("tbody a").first().click();
page.once("dialog", (d) => d.accept());
await page.getByRole("button", { name: "Изтрий" }).click();
await page.waitForURL(/deleted=1/);
ok(true, "admin delete exhibitor");
await page.screenshot({ path: `${OUT}/09-admin-list.png`, fullPage: false });

ok(errors.length === 0, "no browser console errors " + JSON.stringify(errors.slice(0, 5)));
await browser.close();
console.log(process.exitCode ? "\n✗ Има неуспешни проверки" : "\n✓ Всички проверки минаха");

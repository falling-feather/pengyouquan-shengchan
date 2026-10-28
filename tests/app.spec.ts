import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const referenceSizes = [
  { name: "安卓三键", width: 1260, height: 2750 },
  { name: "安卓手势", width: 1084, height: 2412 },
  { name: "紧凑详情", width: 1290, height: 2796 },
  { name: "圆角手势", width: 1200, height: 2670 },
];
const referenceFooterTop = [0.8825, 0.893, 0.9034, 0.9371];
const referenceContentTop = [
  { width: 420, card: 197.3, interactions: 306.7 },
  { width: 393, card: 186.7, interactions: 287.1 },
  { width: 430, card: 163.7, interactions: 250.7 },
  { width: 400, card: 195.3, interactions: 300.0 },
];
let browserErrors: string[] = [];
test.beforeEach(({ page }) => {
  browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
});
test.afterEach(() => {
  expect(browserErrors).toEqual([]);
});

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "导出高清 PNG" })).toBeEnabled({
    timeout: 30_000,
  });
  await page
    .locator(".moment-screen img")
    .evaluateAll((images) =>
      Promise.all(images.map((image) => (image as HTMLImageElement).decode())),
    );
}

async function downloadPng(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "导出高清 PNG" }).click(),
  ]);
  const file = await download.path();
  if (!file) throw new Error("下载文件不可用。");
  const bytes = await readFile(file);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return {
    bytes,
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    name: download.suggestedFilename(),
  };
}

async function compareRegion(
  page: Page,
  element: Locator,
  bytes: Buffer,
  outputWidth: number,
) {
  const preview = await element.screenshot();
  const area = await element.evaluate((node) => {
    const bounds = node.getBoundingClientRect();
    const screen = node.closest(".moment-screen")!.getBoundingClientRect();
    return {
      left: bounds.left - screen.left,
      top: bounds.top - screen.top,
      screenWidth: screen.width,
    };
  });
  return page.evaluate(
    async ({ beforeBase64, afterBase64, area, outputWidth }) => {
      async function image(data: string) {
        const node = new Image();
        node.src = "data:image/png;base64," + data;
        await node.decode();
        return node;
      }
      const [before, after] = await Promise.all([
        image(beforeBase64),
        image(afterBase64),
      ]);
      const first = document.createElement("canvas");
      first.width = before.width;
      first.height = before.height;
      const second = document.createElement("canvas");
      second.width = before.width;
      second.height = before.height;
      const a = first.getContext("2d", { willReadFrequently: true })!;
      const b = second.getContext("2d", { willReadFrequently: true })!;
      const scale = outputWidth / area.screenWidth;
      a.drawImage(before, 0, 0);
      b.imageSmoothingQuality = "high";
      b.drawImage(
        after,
        area.left * scale,
        area.top * scale,
        before.width * scale,
        before.height * scale,
        0,
        0,
        before.width,
        before.height,
      );
      const x = a.getImageData(0, 0, before.width, before.height).data;
      const y = b.getImageData(0, 0, before.width, before.height).data;
      let difference = 0,
        dark = 0,
        exportDark = 0;
      for (let i = 0; i < x.length; i += 4) {
        difference +=
          Math.abs(x[i] - y[i]) +
          Math.abs(x[i + 1] - y[i + 1]) +
          Math.abs(x[i + 2] - y[i + 2]);
        if (x[i] < 100 && x[i + 1] < 100 && x[i + 2] < 100) dark++;
        if (y[i] < 100 && y[i + 1] < 100 && y[i + 2] < 100) exportDark++;
      }
      return {
        meanDifference: difference / ((x.length / 4) * 3),
        dark,
        exportDark,
      };
    },
    {
      beforeBase64: preview.toString("base64"),
      afterBase64: bytes.toString("base64"),
      area,
      outputWidth,
    },
  );
}

test("四种参考样式能按原始尺寸导出 PNG，预览与成图一致", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1500 });
  await ready(page);
  await page.getByLabel("预览缩放").selectOption("actual");
  await page.screenshot({
    path: testInfo.outputPath("desktop.png"),
    fullPage: true,
  });
  for (const [index, reference] of referenceSizes.entries()) {
    await page.locator(".profile-option").nth(index).click();
    await expect(page.locator(".moment-screen")).toHaveAttribute(
      "data-profile",
      ["android-buttons", "android-classic", "compact", "android-rounded"][
        index
      ],
    );
    await page
      .locator(".moment-screen img")
      .evaluateAll((images) =>
        Promise.all(
          images.map((image) => (image as HTMLImageElement).decode()),
        ),
      );
    const preview = await page
      .locator(".moment-screen")
      .screenshot({ path: testInfo.outputPath(`preview-${index + 1}.png`) });
    const result = await downloadPng(page);
    expect(result.width).toBe(reference.width);
    expect(result.height).toBe(reference.height);
    expect(result.name).toContain(reference.name);
    const comparison = await page.evaluate(
      async ({ previewBase64, outputBase64 }) => {
        async function image(data: string) {
          const node = new Image();
          node.src = "data:image/png;base64," + data;
          await node.decode();
          return node;
        }
        const [before, after] = await Promise.all([
          image(previewBase64),
          image(outputBase64),
        ]);
        const first = document.createElement("canvas");
        first.width = before.width;
        first.height = before.height;
        const second = document.createElement("canvas");
        second.width = before.width;
        second.height = before.height;
        const a = first.getContext("2d", { willReadFrequently: true })!;
        const b = second.getContext("2d", { willReadFrequently: true })!;
        a.drawImage(before, 0, 0);
        b.imageSmoothingQuality = "high";
        b.drawImage(after, 0, 0, before.width, before.height);
        const x = a.getImageData(0, 0, before.width, before.height).data;
        const y = b.getImageData(0, 0, before.width, before.height).data;
        let difference = 0,
          dark = 0,
          colored = 0;
        for (let i = 0; i < x.length; i += 4) {
          difference +=
            Math.abs(x[i] - y[i]) +
            Math.abs(x[i + 1] - y[i + 1]) +
            Math.abs(x[i + 2] - y[i + 2]);
          if (y[i] < 110 && y[i + 1] < 110 && y[i + 2] < 110) dark++;
          if (
            Math.max(y[i], y[i + 1], y[i + 2]) -
              Math.min(y[i], y[i + 1], y[i + 2]) >
            35
          )
            colored++;
        }
        return {
          meanDifference: difference / ((x.length / 4) * 3),
          dark,
          colored,
        };
      },
      {
        previewBase64: preview.toString("base64"),
        outputBase64: result.bytes.toString("base64"),
      },
    );
    expect(comparison.dark).toBeGreaterThan(300);
    expect(comparison.colored).toBeGreaterThan(300);
    expect(comparison.meanDifference).toBeLessThan(5);
  }
});

test("四种参考样式的底部区域与原图比例一致", async ({ page }) => {
  await ready(page);
  for (const [index, expected] of referenceFooterTop.entries()) {
    await page.locator(".profile-option").nth(index).click();
    const ratio = await page.locator(".screen-footer").evaluate((footer) => {
      const screen = footer.closest(".moment-screen")!.getBoundingClientRect();
      return (footer.getBoundingClientRect().top - screen.top) / screen.height;
    });
    expect(Math.abs(ratio - expected)).toBeLessThan(0.004);
  }
});

test("示例内容的卡片和互动区与参考图保持相近间距", async ({ page }) => {
  await ready(page);
  for (const [index, expected] of referenceContentTop.entries()) {
    await page.locator(".profile-option").nth(index).click();
    const positions = await page.locator(".moment-screen").evaluate((screen) => {
      const screenBounds = screen.getBoundingClientRect();
      const top = (selector: string) =>
        screen.querySelector(selector)!.getBoundingClientRect().top - screenBounds.top;
      return { width: screenBounds.width, card: top(".link-card"), interactions: top(".interaction-box") };
    });
    const scale = expected.width / positions.width;
    expect(Math.abs(positions.card * scale - expected.card)).toBeLessThan(2);
    expect(Math.abs(positions.interactions * scale - expected.interactions)).toBeLessThan(2);
  }
});

test("编辑点赞、评论和头像后可恢复草稿", async ({ page }) => {
  await ready(page);
  await page.getByLabel("发布者昵称").fill("林间日记");
  await page
    .getByLabel("朋友圈正文")
    .fill("今天有一段新内容。\n第二行也要显示。");
  await page
    .getByLabel("上传发布者头像")
    .setInputFiles(path.resolve("public/samples/friend-01.webp"));
  await expect(page.locator(".post-avatar")).toHaveAttribute(
    "src",
    /^data:image\/webp/,
  );
  await page.getByRole("tab", { name: "点赞与评论" }).click();
  await page
    .getByLabel("批量导入点赞头像")
    .setInputFiles([
      path.resolve("public/samples/friend-02.webp"),
      path.resolve("public/samples/friend-03.webp"),
    ]);
  await expect(page.locator(".likes-grid img")).toHaveCount(2);
  await page.getByRole("button", { name: "添加评论" }).click();
  await page.getByLabel("第3条评论昵称").fill("阿青");
  await page.getByLabel("第3条评论内容").fill("这里是自定义评论。");
  await page.getByLabel("第3条评论回复对象").fill("小林");
  await expect(page.locator(".screen-comment").last()).toContainText(
    "回复 小林：",
  );
  await expect(page.getByText("已保存到本地")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("发布者昵称")).toHaveValue("林间日记");
  await expect(page.getByLabel("朋友圈正文")).toHaveValue(
    "今天有一段新内容。\n第二行也要显示。",
  );
  await expect(page.locator(".post-avatar")).toHaveAttribute(
    "src",
    /^data:image\/webp/,
  );
  await expect(page.locator(".likes-grid img")).toHaveCount(2);
  await expect(page.locator(".screen-comment").last()).toContainText(
    "回复 小林：这里是自定义评论。",
  );
  await page.getByRole("tab", { name: "点赞与评论" }).click();
  await page.getByRole("button", { name: "删除第3条评论" }).click();
  await expect(page.locator(".screen-comment")).toHaveCount(2);
});

test("大量点赞按参考图换行，超出画幅时可导出完整长图", async ({ page }) => {
  await ready(page);
  await page.getByLabel("预览缩放").selectOption("actual");
  await page.locator(".profile-option").nth(3).click();
  await page.getByRole("tab", { name: "点赞与评论" }).click();
  await page.getByRole("button", { name: "59 个参考点赞" }).click();
  const avatars = page.locator(".likes-grid img");
  await expect(avatars).toHaveCount(59);
  const layout = await avatars.evaluateAll((images) => ({
    columns: images.filter(
      (image) =>
        (image as HTMLElement).offsetTop ===
        (images[0] as HTMLElement).offsetTop,
    ).length,
    rows: new Set(images.map((image) => (image as HTMLElement).offsetTop)).size,
  }));
  expect(layout).toEqual({ columns: 9, rows: 7 });
  await page.getByRole("tab", { name: "动态内容" }).click();
  await page
    .getByLabel("朋友圈正文")
    .fill("这是一段需要完整显示的长内容。".repeat(120));
  await expect(
    page.getByText("内容超出手机画幅，请切换为“随内容增高”后导出。"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeDisabled();
  await page.getByLabel("画面高度").selectOption("long");
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  const result = await downloadPng(page);
  expect(result.width).toBe(1200);
  expect(result.height).toBeGreaterThan(2670);
  const lastComment = await compareRegion(
    page,
    page.locator(".screen-comment").last(),
    result.bytes,
    result.width,
  );
  expect(lastComment.dark).toBeGreaterThan(50);
  expect(lastComment.exportDark).toBeGreaterThan(50);
  expect(lastComment.meanDifference).toBeLessThan(12);
});

test("字体可调整并随 PNG 一起导出", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1500 });
  await ready(page);
  await page.getByLabel("朋友圈正文").fill("AAAAA");
  await page.getByLabel("预览缩放").selectOption("actual");
  await page.getByRole("tab", { name: "画面设置" }).click();
  await page.getByLabel("网络显示").selectOption("Wi-Fi");
  await expect(page.locator('.status-right [data-icon="wifi"]')).toBeVisible();
  await page
    .getByLabel("上传字体", { exact: true })
    .setInputFiles(path.resolve("tests/fixtures/block-font.ttf"));
  await expect(page.getByText("当前字体：block-font.ttf")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "导出高清 PNG" })).toBeEnabled({
    timeout: 30_000,
  });
  const result = await downloadPng(page);
  expect(result.width).toBe(1260);
  expect(result.height).toBe(2750);
  const comparison = await compareRegion(
    page,
    page.locator(".post-copy"),
    result.bytes,
    result.width,
  );
  expect(comparison.dark).toBeGreaterThan(400);
  expect(comparison.meanDifference).toBeLessThan(8);
});

test("本地存储失败时准确提示，仍可导出图片", async ({ page }) => {
  await page.addInitScript(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("浏览器存储空间不足", "QuotaExceededError");
    };
  });
  await ready(page);
  await expect(page.locator(".header-note")).toContainText("本地保存失败", {
    timeout: 10_000,
  });
  await expect(
    page.locator(".editor-footer").getByText("本地保存失败", { exact: true }),
  ).toBeVisible();
  const result = await downloadPng(page);
  expect(result.width).toBe(1260);
});

test("导出时图片读取失败会提示，恢复后可以重试", async ({ page }) => {
  await ready(page);
  await page.route("**/samples/author.webp", (route) => route.abort());
  await page.getByRole("button", { name: "导出高清 PNG" }).click();
  await expect(page.getByRole("alert")).toContainText("图片无法读取", {
    timeout: 10_000,
  });
  await expect(
    page.getByRole("button", { name: "导出高清 PNG" }),
  ).toBeEnabled();
  await page.unroute("**/samples/author.webp");
  const result = await downloadPng(page);
  expect(result.width).toBe(1260);
});

test("图片处理完成前不可导出", async ({ page }) => {
  await page.addInitScript(() => {
    const original = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob: Blob) {
      window.setTimeout(() => original.call(this, blob), 1500);
    };
  });
  await ready(page);
  await page
    .getByLabel("上传发布者头像")
    .setInputFiles(path.resolve("public/samples/friend-01.webp"));
  await expect(
    page.getByRole("button", { name: "正在处理素材…" }),
  ).toBeDisabled({ timeout: 3000 });
  await expect(page.getByRole("button", { name: "导出高清 PNG" })).toBeEnabled({
    timeout: 10_000,
  });
  await expect(page.locator(".post-avatar")).toHaveAttribute(
    "src",
    /^data:image\/webp/,
  );
});

test("连续选择头像时保留最后一次选择", async ({ page }) => {
  await page.addInitScript(() => {
    const original = FileReader.prototype.readAsDataURL;
    FileReader.prototype.readAsDataURL = function (blob: Blob) {
      const delay = (blob as File).name === "friend-01.webp" ? 1400 : 100;
      window.setTimeout(() => original.call(this, blob), delay);
    };
  });
  await ready(page);
  const upload = page.getByLabel("上传发布者头像");
  await upload.setInputFiles(path.resolve("public/samples/friend-01.webp"));
  await upload.setInputFiles(path.resolve("public/samples/friend-02.webp"));
  await expect(page.getByRole("button", { name: "导出高清 PNG" })).toBeEnabled({
    timeout: 10_000,
  });
  const differences = await page.evaluate(async () => {
    async function load(src: string) {
      const image = new Image();
      image.src = src;
      await image.decode();
      return image;
    }
    const current = document.querySelector<HTMLImageElement>(".post-avatar")!;
    const [first, second] = await Promise.all([
      load("/samples/friend-01.webp"),
      load("/samples/friend-02.webp"),
    ]);
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const pixels = (image: HTMLImageElement) => {
      ctx.clearRect(0, 0, 96, 96);
      ctx.drawImage(image, 0, 0, 96, 96);
      return ctx.getImageData(0, 0, 96, 96).data;
    };
    const currentPixels = pixels(current),
      firstPixels = pixels(first),
      secondPixels = pixels(second);
    const difference = (a: Uint8ClampedArray, b: Uint8ClampedArray) =>
      a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) /
      a.length;
    return {
      first: difference(currentPixels, firstPixels),
      second: difference(currentPixels, secondPixels),
    };
  });
  expect(differences.second + 5).toBeLessThan(differences.first);
});

test("两倍尺寸模式导出完整的高清 PNG", async ({ page }) => {
  await ready(page);
  await page.getByLabel("导出清晰度").selectOption("2");
  const result = await downloadPng(page);
  expect(result.width).toBe(2520);
  expect(result.height).toBe(5500);
});

test("窄屏可编辑和导出，页面不会横向溢出", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByLabel("发布者昵称").fill("手机测试");
  await expect(page.locator(".post-name")).toContainText("手机测试");
  const widths = await page.evaluate(() => ({
    body: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }));
  expect(widths.body).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({
    path: testInfo.outputPath("mobile.png"),
    fullPage: true,
  });
  const result = await downloadPng(page);
  expect(result.width).toBe(1260);
  expect(result.height).toBe(2750);
});

import { chromium } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const base = "http://127.0.0.1:5178/";
const downloadDirectory = path.resolve(".tmp", "portable-downloads");
await mkdir(downloadDirectory, { recursive: true });

function requireCondition(value, message) {
  if (!value) throw new Error(message);
}

const head = await fetch(base, { method: "HEAD" });
requireCondition(head.status === 200, "主页 HEAD 请求失败。");
requireCondition(
  head.headers.get("content-type")?.includes("text/html"),
  "主页类型不正确。",
);
requireCondition(
  Number(head.headers.get("content-length")) > 0,
  "主页长度不正确。",
);
requireCondition(
  (await fetch(base + "missing-file")).status === 404,
  "缺失文件应返回 404。",
);
requireCondition(
  (await fetch(base, { method: "POST" })).status === 405,
  "不支持的请求方法应返回 405。",
);

function rawRequest(request) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 5178 });
    const chunks = [];
    socket.setTimeout(5000, () => socket.destroy(new Error("路径检查超时。")));
    socket.on("connect", () =>
      socket.write(request + " HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"),
    );
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("end", () => resolve(Buffer.concat(chunks)));
    socket.on("error", reject);
  });
}
const traversal = await rawRequest("GET /%2e%2e%2fREADME.md");
requireCondition(
  traversal.toString("ascii").split("\r\n")[0].includes(" 403 "),
  "越出网页目录的路径应被拒绝。",
);
const missingHead = await rawRequest("HEAD /missing-file");
const headerEnd = missingHead.indexOf("\r\n\r\n");
requireCondition(
  missingHead.toString("ascii", 0, headerEnd).startsWith("HTTP/1.1 404"),
  "缺失文件的 HEAD 请求应返回 404。",
);
requireCondition(
  missingHead.length === headerEnd + 4,
  "HEAD 请求不能返回响应正文。",
);
const forbiddenHead = await rawRequest("HEAD /%2e%2e%2fREADME.md");
const forbiddenHeaderEnd = forbiddenHead.indexOf("\r\n\r\n");
requireCondition(
  forbiddenHead
    .toString("ascii", 0, forbiddenHeaderEnd)
    .startsWith("HTTP/1.1 403"),
  "目录越界的 HEAD 请求应返回 403。",
);
requireCondition(
  forbiddenHead.length === forbiddenHeaderEnd + 4,
  "被拒绝的 HEAD 请求不能返回响应正文。",
);

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  downloadsPath: downloadDirectory,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "load" });
  await page
    .getByRole("button", { name: "导出高清 PNG" })
    .waitFor({ state: "visible" });
  await page
    .getByRole("button", { name: "导出高清 PNG" })
    .waitFor({ state: "attached" });
  await page.waitForFunction(
    () => !document.querySelector(".export-button")?.disabled,
  );
  await page.getByLabel("发布者昵称").fill("便携测试");
  await page.locator(".profile-option").nth(3).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出高清 PNG" }).click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  requireCondition(downloadedPath, "便携版未生成下载文件。");
  const bytes = await readFile(downloadedPath);
  requireCondition(
    bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a",
    "下载文件不是 PNG。",
  );
  requireCondition(
    bytes.readUInt32BE(16) === 1200 && bytes.readUInt32BE(20) === 2670,
    "PNG 尺寸不正确。",
  );
  requireCondition(
    errors.length === 0,
    "页面出现脚本错误：" + errors.join("；"),
  );
  console.log(
    JSON.stringify({
      page: "已打开",
      style: "参考图4",
      png: "1200 × 2670",
      http: "GET、HEAD、404、405、目录边界均正常",
    }),
  );
} finally {
  await browser.close();
}

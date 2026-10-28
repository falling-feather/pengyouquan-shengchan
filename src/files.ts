import { toCanvas } from "html-to-image";
import {
  getExportDimensions,
  type CanvasMode,
  type ExportScale,
  type StyleProfile,
  type TypographySettings,
} from "./domain";
import builtInFontUrl from "./assets/fonts/noto-sans-sc-regular.woff2?url";

function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("文件读取失败。"));
    reader.onerror = () => reject(new Error("文件读取失败，请重新选择。"));
    reader.readAsDataURL(file);
  });
}

export async function loadImage(file: File, maxSide = 512): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件。");
  const data = await readDataUrl(file);
  const image = new Image();
  image.src = data;
  try {
    await image.decode();
  } catch {
    throw new Error("图片无法读取，请选择其他图片。");
  }
  const scale = Math.min(
    1,
    maxSide / Math.max(image.naturalWidth, image.naturalHeight),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理图片。");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.94);
}

export async function loadFont(
  file: File,
): Promise<NonNullable<TypographySettings["font"]>> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  const formats: Record<string, string> = {
    ttf: "truetype",
    otf: "opentype",
    woff: "woff",
    woff2: "woff2",
  };
  if (!extension || !formats[extension])
    throw new Error("请选择 TTF、OTF、WOFF 或 WOFF2 字体文件。");
  const source = await readDataUrl(file);
  const font = {
    family: "User Moment Font",
    source,
    format: formats[extension],
    label: file.name,
  };
  try {
    await new FontFace(font.family, `url(${JSON.stringify(font.source)})`, {
      weight: "400",
    }).load();
  } catch (error) {
    throw new Error("字体无法加载，请选择其他字体文件。", { cause: error });
  }
  return font;
}

let activeFont: FontFace | null = null;
let activeFontSource: string | null = null;
let fontRegistration = 0;
export async function registerFont(
  font: NonNullable<TypographySettings["font"]>,
) {
  const registration = ++fontRegistration;
  if (activeFontSource === font.source) return;
  try {
    const face = new FontFace(
      font.family,
      `url(${JSON.stringify(font.source)})`,
      { weight: "400" },
    );
    await face.load();
    if (registration !== fontRegistration) return;
    if (activeFont) document.fonts.delete(activeFont);
    document.fonts.add(face);
    activeFont = face;
    activeFontSource = font.source;
    await document.fonts.ready;
  } catch {
    throw new Error("字体无法加载，请选择其他字体文件。");
  }
}

export function clearCustomFont() {
  fontRegistration++;
  if (activeFont) document.fonts.delete(activeFont);
  activeFont = null;
  activeFontSource = null;
}

let builtInFontData: Promise<string> | undefined;
async function fontDataUrl() {
  if (!builtInFontData)
    builtInFontData = (async () => {
      const response = await fetch(builtInFontUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return readDataUrl(await response.blob());
    })();
  try {
    return await builtInFontData;
  } catch (error) {
    builtInFontData = undefined;
    throw new Error("字体无法读取，请重新载入页面后重试。", { cause: error });
  }
}

async function inlineImages(node: HTMLElement): Promise<string[]> {
  const cached = new Map<string, Promise<string>>();
  const images = Array.from(node.querySelectorAll("img"));
  return Promise.all(
    images.map(async (image) => {
      try {
        await image.decode();
        const source = image.currentSrc || image.src;
        if (source.startsWith("data:")) return source;
        if (!cached.has(source))
          cached.set(
            source,
            (async () => {
              const response = await fetch(source);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const blob = await response.blob();
              if (!blob.type.startsWith("image/"))
                throw new Error("Invalid image content.");
              return readDataUrl(blob);
            })(),
          );
        return await cached.get(source)!;
      } catch (error) {
        throw new Error("图片无法读取，请检查素材或重新载入页面后重试。", {
          cause: error,
        });
      }
    }),
  );
}

export async function exportPng(
  node: HTMLElement,
  profile: StyleProfile,
  mode: CanvasMode,
  scale: ExportScale,
  typography: TypographySettings,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (mode === "phone" && node.scrollHeight > node.clientHeight + 1)
    throw new Error("内容超出手机画幅，请选择“随内容增高”后导出。");
  await document.fonts.ready;
  const height =
    mode === "phone"
      ? profile.height
      : Number.parseFloat(getComputedStyle(node).height);
  const dimensions = getExportDimensions(profile, height, scale, mode);
  const [images, fontData] = await Promise.all([
    inlineImages(node),
    fontDataUrl(),
  ]);
  const fontEmbedCSS =
    `@font-face { font-family: "Moment Sans"; src: url(${JSON.stringify(fontData)}) format("woff2"); font-weight: 400; }` +
    (typography.font
      ? `\n@font-face { font-family: "User Moment Font"; src: url(${JSON.stringify(typography.font.source)}) format("${typography.font.format}"); font-weight: 400; }`
      : "");
  const clone = node.cloneNode(true) as HTMLElement;
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
  });
  Array.from(clone.querySelectorAll("img")).forEach((image, index) => {
    image.src = images[index];
    image.removeAttribute("srcset");
  });
  document.body.appendChild(clone);
  try {
    await Promise.all(
      Array.from(clone.querySelectorAll("img"), (image) => image.decode()),
    );
    const canvas = await toCanvas(clone, {
      width: profile.width,
      height,
      canvasWidth: dimensions.width,
      canvasHeight: dimensions.height,
      pixelRatio: 1,
      skipAutoScale: true,
      backgroundColor: "#fff",
      fontEmbedCSS,
      style: { position: "static", left: "auto", top: "auto" },
    });
    if (
      canvas.width !== dimensions.width ||
      canvas.height !== dimensions.height
    )
      throw new Error("浏览器无法生成所需尺寸，请使用原尺寸或缩短内容。");
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("PNG 导出失败，请尝试缩短内容或降低导出尺寸。");
    return { blob, ...dimensions };
  } finally {
    clone.remove();
  }
}

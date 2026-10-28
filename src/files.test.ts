import { afterEach, expect, it, vi } from "vitest";
import { clearCustomFont, registerFont } from "./files";

afterEach(() => {
  clearCustomFont();
  vi.unstubAllGlobals();
});

it("再次选择当前字体时，先前尚未加载完成的字体不会覆盖它", async () => {
  let finishSecond!: () => void;
  const active = new Set<FontFace>();
  class FakeFontFace {
    constructor(
      public family: string,
      public source: string,
    ) {}
    async load() {
      if (this.source.includes("font-B"))
        await new Promise<void>((resolve) => {
          finishSecond = resolve;
        });
      return this;
    }
  }
  vi.stubGlobal("FontFace", FakeFontFace);
  vi.stubGlobal("document", {
    fonts: {
      add: (face: FontFace) => active.add(face),
      delete: (face: FontFace) => active.delete(face),
      ready: Promise.resolve(),
    },
  });
  const fontA = {
    family: "User Moment Font",
    source: "data:font-A",
    format: "woff2",
    label: "A",
  };
  const fontB = {
    family: "User Moment Font",
    source: "data:font-B",
    format: "woff2",
    label: "B",
  };
  await registerFont(fontA);
  const previous = registerFont(fontB);
  await registerFont(fontA);
  finishSecond();
  await previous;
  expect(
    [...active].map((face) => (face as unknown as FakeFontFace).source),
  ).toEqual(['url("data:font-A")']);
});

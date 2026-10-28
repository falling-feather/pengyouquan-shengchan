import { describe, expect, it } from "vitest";
import {
  profiles,
  getExportDimensions,
  resizeLikes,
  moveItem,
  makeInitialDocument,
  MAX_OUTPUT_PIXELS,
} from "./domain";

describe("高清 PNG 的尺寸", () => {
  it.each(profiles)("$label 保留参考原图的精确尺寸", (profile) => {
    expect(getExportDimensions(profile, profile.height, 1, "phone")).toEqual(
      profile.reference,
    );
    expect(getExportDimensions(profile, profile.height, 2, "phone")).toEqual({
      width: profile.reference.width * 2,
      height: profile.reference.height * 2,
    });
  });

  it("长图按实际内容高度等比导出，不裁去末尾评论", () => {
    const profile = profiles[0];
    expect(
      getExportDimensions(profile, profile.height + 200, 1, "long"),
    ).toEqual({
      width: 1260,
      height: Math.ceil((profile.height + 200) * 3),
    });
  });

  it("拒绝超过画布上限的尺寸，而不是暗中缩小或生成残图", () => {
    expect(() =>
      getExportDimensions(profiles[0], MAX_OUTPUT_PIXELS, 2, "long"),
    ).toThrow("尺寸");
    expect(() =>
      getExportDimensions(profiles[0], Number.NaN, 1, "long"),
    ).toThrow("尺寸");
  });
});

describe("点赞与评论编辑", () => {
  it("调整数量保留已编辑头像，新增条目相互独立", () => {
    const original = [
      { id: "edited", name: "已编辑", avatar: "data:image/png;base64,abc" },
    ];
    const expanded = resizeLikes(original, 3);
    expect(expanded[0]).toEqual(original[0]);
    expect(new Set(expanded.map((person) => person.id)).size).toBe(3);
    expect(original).toHaveLength(1);
    expect(resizeLikes(expanded, 0)).toEqual([]);
  });

  it("改变顺序移动完整条目，回复对象保持原始文字", () => {
    const comments = makeInitialDocument().comments;
    const changed = moveItem(comments, 0, 1);
    expect(changed).toEqual([comments[1], comments[0]]);
    expect(moveItem(comments, 0, -1)).toEqual(comments);
    expect(comments).not.toBe(changed);
  });

  it("每次新建动态拥有独立的数据，不共享评论或点赞数组", () => {
    const first = makeInitialDocument();
    const second = makeInitialDocument();
    first.comments[0].text = "修改";
    first.likes.pop();
    expect(second.comments[0].text).not.toBe("修改");
    expect(second.likes).toHaveLength(7);
  });
});

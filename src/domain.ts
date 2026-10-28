export type ProfileId =
  | "android-buttons"
  | "android-classic"
  | "compact"
  | "android-rounded";
export type CanvasMode = "phone" | "long";
export type ExportScale = 1 | 2;
export interface Person {
  id: string;
  name: string;
  avatar: string;
}
export interface Comment extends Person {
  text: string;
  time: string;
  reply: string;
}
export interface MomentDocument {
  author: { name: string; avatar: string; badge: "none" | "plane" };
  body: string;
  card: { visible: boolean; title: string; cover: string };
  postTime: string;
  location: string;
  operations: { pin: boolean; people: boolean; delete: boolean };
  likes: Person[];
  comments: Comment[];
}
export interface FrameSettings {
  clock: string;
  battery: number;
  network: "5G" | "5GA" | "4G" | "4G + 5G" | "Wi-Fi";
  showStatus: boolean;
  showNotifications: boolean;
  showComposer: boolean;
  showNavigation: boolean;
  mode: CanvasMode;
  statusImage: string | null;
}
export interface TypographySettings {
  sizeOffset: number;
  lineOffset: number;
  weight: 400 | 500;
  font: {
    family: string;
    source: string;
    format: string;
    label: string;
  } | null;
}
export interface Layout {
  statusHeight: number;
  statusInset: number;
  navHeight: number;
  mainTop: number;
  mainInset: number;
  avatarSize: number;
  avatarGap: number;
  bodySize: number;
  bodyLine: number;
  nameSize: number;
  nameGap: number;
  cardRadius: number;
  cardGap: number;
  cardPad: number;
  cardTop: number;
  coverSize: number;
  cardSize: number;
  cardLine: number;
  metaTop: number;
  metaSize: number;
  interactionTop: number;
  panelRadius: number;
  interactionIconCol: number;
  interactionPadRight: number;
  likesPad: number;
  likeSize: number;
  likeGap: number;
  commentAvatar: number;
  commentGap: number;
  commentPad: number;
  commentSize: number;
  commentLine: number;
  commentTimeSize: number;
}
export interface StyleProfile {
  id: ProfileId;
  label: string;
  referenceNumber: number;
  description: string;
  reference: { width: number; height: number };
  width: number;
  height: number;
  layout: Layout;
  navigation: "buttons" | "gesture" | "none";
  composer: "send" | "microphone";
}
const standard: Layout = {
  statusHeight: 43,
  statusInset: 23,
  navHeight: 52,
  mainTop: 16,
  mainInset: 13,
  avatarSize: 44,
  avatarGap: 8,
  bodySize: 18,
  bodyLine: 24,
  nameSize: 18,
  nameGap: 8,
  cardRadius: 8,
  cardGap: 11,
  cardPad: 6,
  cardTop: 7,
  coverSize: 53,
  cardSize: 15,
  cardLine: 21,
  metaTop: 12,
  metaSize: 14,
  interactionTop: 11,
  panelRadius: 8,
  interactionIconCol: 51,
  interactionPadRight: 15,
  likesPad: 8,
  likeSize: 34,
  likeGap: 4,
  commentAvatar: 34,
  commentGap: 9,
  commentPad: 13,
  commentSize: 16,
  commentLine: 22,
  commentTimeSize: 12,
};

export const profiles: readonly StyleProfile[] = [
  {
    id: "android-buttons",
    label: "安卓三键",
    referenceNumber: 1,
    description: "圆角卡片 · 三键导航",
    reference: { width: 1260, height: 2750 },
    width: 420,
    height: 2750 / 3,
    layout: standard,
    navigation: "buttons",
    composer: "send",
  },
  {
    id: "android-classic",
    label: "安卓手势",
    referenceNumber: 2,
    description: "直角卡片 · 宽侧边距",
    reference: { width: 1084, height: 2412 },
    width: 393,
    height: (2412 / 1084) * 393,
    layout: {
      ...standard,
      statusHeight: 41,
      statusInset: 29,
      navHeight: 45,
      mainInset: 22,
      avatarSize: 46,
      avatarGap: 9,
      bodySize: 18,
      bodyLine: 25,
      nameSize: 19,
      nameGap: 6,
      cardRadius: 0,
      cardGap: 9,
      cardPad: 5,
      cardTop: 4,
      coverSize: 46,
      cardSize: 15,
      cardLine: 19,
      metaSize: 15,
      interactionTop: 11,
      panelRadius: 2,
      interactionIconCol: 55,
      interactionPadRight: 11,
      likesPad: 9,
      likeSize: 35,
      likeGap: 8,
      commentAvatar: 35,
      commentGap: 9,
      commentPad: 14,
      commentSize: 17,
      commentLine: 21,
    },
    navigation: "gesture",
    composer: "send",
  },
  {
    id: "compact",
    label: "紧凑详情",
    referenceNumber: 3,
    description: "紧凑排版 · 麦克风输入栏",
    reference: { width: 1290, height: 2796 },
    width: 430,
    height: 2796 / 3,
    layout: {
      ...standard,
      statusHeight: 46,
      statusInset: 48,
      navHeight: 52,
      mainTop: 14,
      mainInset: 12,
      avatarSize: 40,
      avatarGap: 10,
      bodySize: 16,
      bodyLine: 23,
      nameSize: 17,
      nameGap: 6,
      cardRadius: 10,
      cardGap: 8,
      cardPad: 6,
      cardTop: 1,
      coverSize: 45,
      cardSize: 14,
      cardLine: 20,
      metaTop: 8,
      metaSize: 14,
      interactionTop: 1,
      panelRadius: 9,
      interactionIconCol: 50,
      interactionPadRight: 10,
      likesPad: 8,
      likeSize: 36,
      likeGap: 8,
      commentAvatar: 36,
      commentGap: 6,
      commentPad: 12,
      commentSize: 15,
      commentLine: 21,
    },
    navigation: "none",
    composer: "microphone",
  },
  {
    id: "android-rounded",
    label: "圆角手势",
    referenceNumber: 4,
    description: "圆角卡片 · 九列点赞",
    reference: { width: 1200, height: 2670 },
    width: 400,
    height: 2670 / 3,
    layout: {
      ...standard,
      statusHeight: 44,
      statusInset: 26,
      navHeight: 50,
      mainInset: 12,
      avatarSize: 42,
      avatarGap: 8,
      bodySize: 17,
      bodyLine: 24,
      nameSize: 17,
      cardSize: 15,
      coverSize: 50,
      interactionTop: 10,
      interactionIconCol: 50,
      interactionPadRight: 5,
      likeSize: 32,
      likeGap: 4,
      commentAvatar: 32,
      commentSize: 15,
      commentLine: 21,
    },
    navigation: "gesture",
    composer: "send",
  },
];

export const defaultFrame: FrameSettings = {
  clock: "11:31",
  battery: 63,
  network: "5G",
  showStatus: true,
  showNotifications: true,
  showComposer: true,
  showNavigation: true,
  mode: "phone",
  statusImage: null,
};
export const defaultTypography: TypographySettings = {
  sizeOffset: 0,
  lineOffset: 0,
  weight: 400,
  font: null,
};
export const MAX_LIKES = 200;
export const MAX_OUTPUT_PIXELS = 32_000_000;

export function sampleAvatar(index: number): string {
  return `${import.meta.env.BASE_URL}samples/friend-${String((index % 59) + 1).padStart(2, "0")}.webp`;
}
export function makePerson(index: number): Person {
  return {
    id: crypto.randomUUID(),
    name: `朋友${index + 1}`,
    avatar: sampleAvatar(index),
  };
}
export function resizeLikes(
  people: readonly Person[],
  count: number,
): Person[] {
  const length = Math.max(0, Math.min(MAX_LIKES, Math.trunc(count) || 0));
  return Array.from(
    { length },
    (_, index) => people[index] ?? makePerson(index),
  );
}
export function moveItem<T>(
  items: readonly T[],
  index: number,
  direction: -1 | 1,
): T[] {
  const next = [...items];
  const target = index + direction;
  if (
    index < 0 ||
    index >= items.length ||
    target < 0 ||
    target >= items.length
  )
    return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export function makeInitialDocument(): MomentDocument {
  const avatar = `${import.meta.env.BASE_URL}samples/author.webp`;
  return {
    author: { name: "小林", avatar, badge: "none" },
    body: "不算难，阿里云的官方实训证书，拿了不亏。",
    card: {
      visible: true,
      title: "敲开名企大门！参与阿里云在线实训项目，用官方证书为你的实力代言。",
      cover: `${import.meta.env.BASE_URL}samples/link-cover.webp`,
    },
    postTime: "昨天 11:30",
    location: "",
    operations: { pin: true, people: false, delete: true },
    likes: Array.from({ length: 7 }, (_, index) => makePerson(index)),
    comments: [
      {
        id: crypto.randomUUID(),
        name: "小林",
        avatar,
        text: "分享，简历能加分，参加的一起。",
        time: "昨天 11:30",
        reply: "",
      },
      {
        id: crypto.randomUUID(),
        name: "小林",
        avatar,
        text: "资料和具体说明都在链接里，有问题可以留言交流。",
        time: "昨天 11:31",
        reply: "",
      },
    ],
  };
}

export function getExportDimensions(
  profile: StyleProfile,
  renderedHeight: number,
  scale: ExportScale,
  mode: CanvasMode,
) {
  const width = profile.reference.width * scale;
  const height =
    mode === "phone"
      ? profile.reference.height * scale
      : Math.ceil((renderedHeight * width) / profile.width);
  if (
    !Number.isFinite(height) ||
    height <= 0 ||
    width * height > MAX_OUTPUT_PIXELS ||
    height > 16384
  ) {
    throw new Error("导出尺寸过大，请选择参考原尺寸，或减少内容后重试。");
  }
  return { width, height };
}

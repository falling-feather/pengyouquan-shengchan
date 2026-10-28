import type {
  FrameSettings,
  MomentDocument,
  ProfileId,
  TypographySettings,
} from "./domain";

export interface Draft {
  version: 1;
  profileId: ProfileId;
  moment: MomentDocument;
  frame: FrameSettings;
  typography: TypographySettings;
}

let connection: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("moment-studio", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("drafts");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("无法打开本地草稿。"));
      request.onblocked = () => reject(new Error("本地草稿被其他页面占用。"));
    });
  return connection;
}

export async function readDraft(): Promise<Draft | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readonly");
    const request = transaction.objectStore("drafts").get("current");
    request.onsuccess = () => {
      const value: unknown = request.result;
      if (value === undefined) {
        resolve(null);
        return;
      }
      if (
        !value ||
        typeof value !== "object" ||
        (value as { version?: unknown }).version !== 1
      ) {
        reject(new Error("本地草稿格式无法识别。"));
        return;
      }
      resolve(value as Draft);
    };
    request.onerror = () => reject(new Error("本地草稿读取失败。"));
  });
}

export async function saveDraft(draft: Draft): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    transaction.objectStore("drafts").put(draft, "current");
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("本地草稿保存失败。"));
    transaction.onabort = () => reject(new Error("本地草稿保存中断。"));
  });
}

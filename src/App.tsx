import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  defaultFrame,
  defaultTypography,
  makeInitialDocument,
  profiles,
  type CanvasMode,
  type ExportScale,
  type FrameSettings,
  type MomentDocument,
  type ProfileId,
  type TypographySettings,
} from "./domain";
import { readDraft, saveDraft } from "./draft";
import { Editor } from "./Editor";
import { clearCustomFont, exportPng, registerFont } from "./files";
import { Screen } from "./Screen";
import { Icon } from "./WechatIcon";

type Tab = "content" | "interactions" | "frame";
type Zoom = "fit" | "actual";
type Geometry = { scale: number; height: number };

export function App() {
  const [profileId, setProfileId] = useState<ProfileId>("android-buttons");
  const [moment, setMoment] = useState<MomentDocument>(makeInitialDocument);
  const [frame, setFrame] = useState<FrameSettings>({ ...defaultFrame });
  const [typography, setTypography] = useState<TypographySettings>({
    ...defaultTypography,
  });
  const [tab, setTab] = useState<Tab>("content");
  const [zoom, setZoom] = useState<Zoom>("fit");
  const [resolution, setResolution] = useState<ExportScale>(1);
  const [geometry, setGeometry] = useState<Geometry>({
    scale: 0.8,
    height: profiles[0].height,
  });
  const [ready, setReady] = useState(false);
  const [storageReady, setStorageReady] = useState(true);
  const [savedStatus, setSavedStatus] = useState("正在读取本地草稿…");
  const [fontReady, setFontReady] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pendingAssets, setPendingAssets] = useState(0);
  const [notice, setNotice] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const screenRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLElement>(null);
  const saveRevision = useRef(0);
  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0];

  useEffect(() => {
    let active = true;
    readDraft()
      .then((draft) => {
        if (!active) return;
        if (draft) {
          if (!profiles.some((item) => item.id === draft.profileId))
            throw new Error("本地草稿使用了无法识别的样式。");
          setProfileId(draft.profileId);
          setMoment(draft.moment);
          setFrame(draft.frame);
          setTypography(draft.typography);
        }
        setSavedStatus(draft ? "已恢复本地草稿" : "已准备好本地草稿");
        setReady(true);
      })
      .catch((error) => {
        if (!active) return;
        setStorageReady(false);
        setSavedStatus("本地草稿不可用");
        setNotice(
          error instanceof Error ? error.message : "本地草稿读取失败。",
        );
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || !storageReady) return;
    const revision = ++saveRevision.current;
    setSavedStatus("保存中…");
    const timer = window.setTimeout(() => {
      saveDraft({ version: 1, profileId, moment, frame, typography })
        .then(() => {
          if (revision === saveRevision.current) setSavedStatus("已保存到本地");
        })
        .catch((error) => {
          if (revision === saveRevision.current) {
            setSavedStatus("本地保存失败");
            setNotice(
              error instanceof Error ? error.message : "本地草稿保存失败。",
            );
          }
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [ready, storageReady, profileId, moment, frame, typography]);

  useLayoutEffect(() => {
    if (!ready) return;
    let active = true;
    setFontReady(false);
    (async () => {
      const fonts = await document.fonts.load(
        '400 16px "Moment Sans"',
        "朋友圈详情",
      );
      if (!fonts.length)
        throw new Error("内置中文字体无法加载，请刷新页面后重试。");
      if (!active) return;
      if (typography.font) await registerFont(typography.font);
      else clearCustomFont();
      if (active) setFontReady(true);
    })().catch((error) => {
      if (active)
        setNotice(error instanceof Error ? error.message : "字体加载失败。");
    });
    return () => {
      active = false;
    };
  }, [ready, typography.font]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const screen = screenRef.current;
    if (!ready || !stage || !screen) return;
    const update = () => {
      const availableWidth = Math.max(1, stage.clientWidth - 32);
      const horizontal = Math.min(1, availableWidth / profile.width);
      const vertical = Math.max(400, window.innerHeight - 265) / profile.height;
      const scale =
        zoom === "fit" ? Math.min(horizontal, vertical) : horizontal;
      const height = Number.parseFloat(getComputedStyle(screen).height);
      setGeometry((previous) =>
        Math.abs(previous.scale - scale) < 0.0001 &&
        Math.abs(previous.height - height) < 0.1
          ? previous
          : { scale, height },
      );
      setOverflow(
        frame.mode === "phone" && screen.scrollHeight > screen.clientHeight + 1,
      );
    };
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(screen);
    const body = screen.querySelector(".screen-body");
    if (body) observer.observe(body);
    const footer = screen.querySelector(".screen-footer");
    if (footer) observer.observe(footer);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ready, profile, moment, frame, typography, zoom, fontReady]);

  async function download() {
    const screen = screenRef.current;
    if (!screen || exporting) return;
    setNotice("");
    setExportStatus("");
    setExporting(true);
    try {
      const result = await exportPng(
        screen,
        profile,
        frame.mode,
        resolution,
        typography,
      );
      const objectUrl = URL.createObjectURL(result.blob);
      const link = document.createElement("a");
      const date = new Date();
      const stamp = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("");
      link.href = objectUrl;
      link.download = `朋友圈-${profile.label}-${stamp}.png`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      setExportStatus(`已导出 ${result.width} × ${result.height} PNG`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "导出失败，请重试。");
    } finally {
      setExporting(false);
    }
  }

  if (!ready) return <div className="initial-loading">正在读取本地草稿…</div>;
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">
            <Icon name="comment" />
          </span>
          <div>
            <h1>朋友圈生产</h1>
            <p>把内容排成熟悉的朋友圈详情页</p>
          </div>
        </div>
        <div className="header-note">
          <span
            className={`header-dot ${!storageReady || savedStatus === "本地保存失败" ? "error" : ""}`}
          />
          {!storageReady
            ? "本地草稿不可用"
            : savedStatus === "本地保存失败"
              ? "本地保存失败"
              : savedStatus === "保存中…"
                ? "正在保存到本地"
                : "内容保存在本地"}
        </div>
        <button
          className="button mobile-preview"
          type="button"
          onClick={() =>
            previewRef.current?.scrollIntoView({ behavior: "smooth" })
          }
        >
          查看预览
        </button>
      </header>
      {notice && (
        <div className="notice" role="alert">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="关闭提示"
          >
            ×
          </button>
        </div>
      )}
      <fieldset className="interaction-lock" disabled={exporting}>
        <div className="app-workspace">
          <Editor
            tab={tab}
            setTab={setTab}
            moment={moment}
            setMoment={setMoment}
            frame={frame}
            setFrame={setFrame}
            typography={typography}
            setTypography={setTypography}
            savedStatus={savedStatus}
            onError={setNotice}
            onPendingChange={(change) =>
              setPendingAssets((current) => current + change)
            }
          />
          <section
            className="preview"
            ref={previewRef}
            aria-label="朋友圈详情预览"
          >
            <div className="preview-heading">
              <div>
                <h2>界面预览</h2>
                <p>选择参考样式，内容会自动保留</p>
              </div>
              <span>
                {moment.likes.length} 个赞 · {moment.comments.length} 条评论
              </span>
            </div>
            <div className="profile-picker" role="group" aria-label="参考样式">
              {profiles.map((item) => (
                <button
                  className="profile-option"
                  key={item.id}
                  type="button"
                  aria-pressed={profileId === item.id}
                  onClick={() => {
                    setProfileId(item.id);
                    setExportStatus("");
                  }}
                >
                  <strong>{item.label}</strong>
                  <span>参考图 {item.referenceNumber}</span>
                </button>
              ))}
            </div>
            <div className="preview-card">
              <div className="preview-card-head">
                <div>
                  <strong>{profile.label}</strong>
                  <span>{profile.description}</span>
                </div>
                <label className="zoom-label">
                  预览缩放
                  <select
                    aria-label="预览缩放"
                    value={zoom}
                    onChange={(event) => setZoom(event.target.value as Zoom)}
                  >
                    <option value="fit">适应窗口</option>
                    <option value="actual">实际大小</option>
                  </select>
                </label>
              </div>
              <div className="screen-stage" ref={stageRef}>
                <div
                  className="screen-frame"
                  style={{
                    width: profile.width * geometry.scale,
                    height: geometry.height * geometry.scale,
                  }}
                >
                  <div
                    className="screen-scale"
                    style={{ transform: `scale(${geometry.scale})` }}
                  >
                    <Screen
                      ref={screenRef}
                      profile={profile}
                      moment={moment}
                      frame={frame}
                      typography={typography}
                    />
                  </div>
                </div>
              </div>
              <div className="preview-card-foot">
                <span>
                  参考图 {profile.referenceNumber} · {profile.reference.width} ×{" "}
                  {profile.reference.height}
                </span>
                <span>
                  {profile.id === "compact" ? "系统来源待确认" : "参考截图样式"}
                </span>
              </div>
            </div>
            <div className="export-panel">
              <div className="export-options">
                <label>
                  画面高度
                  <select
                    aria-label="画面高度"
                    value={frame.mode}
                    onChange={(event) =>
                      setFrame((current) => ({
                        ...current,
                        mode: event.target.value as CanvasMode,
                      }))
                    }
                  >
                    <option value="phone">参考手机画幅</option>
                    <option value="long">随内容增高</option>
                  </select>
                </label>
                <label>
                  导出清晰度
                  <select
                    aria-label="导出清晰度"
                    value={resolution}
                    onChange={(event) =>
                      setResolution(Number(event.target.value) as ExportScale)
                    }
                  >
                    <option value={1}>参考原尺寸</option>
                    <option value={2}>2 倍尺寸</option>
                  </select>
                </label>
              </div>
              {overflow && (
                <div className="overflow-notice" role="status">
                  内容超出手机画幅，请切换为“随内容增高”后导出。
                </div>
              )}
              <button
                className="button primary export-button"
                type="button"
                onClick={download}
                disabled={
                  overflow || !fontReady || exporting || pendingAssets > 0
                }
              >
                <Icon name="download" />
                {exporting
                  ? "正在生成 PNG…"
                  : pendingAssets > 0
                    ? "正在处理素材…"
                    : !fontReady
                      ? "正在准备字体…"
                      : "导出高清 PNG"}
              </button>
              <div className="export-foot">
                <span aria-live="polite">
                  {exportStatus || "图片在浏览器内生成"}
                </span>
                <span>PNG</span>
              </div>
            </div>
          </section>
        </div>
      </fieldset>
    </div>
  );
}

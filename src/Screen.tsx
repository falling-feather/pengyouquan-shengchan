import { forwardRef, type CSSProperties, type ReactNode } from "react";
import type {
  FrameSettings,
  Layout,
  MomentDocument,
  StyleProfile,
  TypographySettings,
} from "./domain";
import { Icon } from "./WechatIcon";

interface ScreenProps {
  profile: StyleProfile;
  moment: MomentDocument;
  frame: FrameSettings;
  typography: TypographySettings;
}

function Signal() {
  return (
    <span className="signal" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function linkedText(text: string): ReactNode {
  return text.split(/(https?:\/\/[^\s]+|\b1\d{10}\b)/g).map((part, index) =>
    /^(https?:\/\/[^\s]+|1\d{10})$/.test(part) ? (
      <span className="linked-text" key={index}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

function StatusBar({ profile, frame }: Pick<ScreenProps, "profile" | "frame">) {
  if (!frame.showStatus) return null;
  if (frame.statusImage)
    return (
      <div className="status-uploaded">
        <img src={frame.statusImage} alt="自定义手机状态栏" />
      </div>
    );
  const notification =
    profile.id === "android-buttons"
      ? [1, 2, 3, 4, 5]
      : profile.id === "android-classic"
        ? [1, 2]
        : [1];
  const notificationReference =
    profile.id === "android-buttons"
      ? 1
      : profile.id === "android-classic"
        ? 2
        : 4;
  return (
    <div className="status-bar" data-profile={profile.id}>
      <div className="status-left">
        <span className="status-clock">{frame.clock}</span>
        {profile.id === "compact" && (
          <Icon name="moon" className="status-moon" />
        )}
        {frame.showNotifications && profile.id !== "compact" && (
          <span className="status-notifications" aria-hidden="true">
            {notification.map((index) => (
              <img
                className="notification"
                src={`${import.meta.env.BASE_URL}samples/status-${notificationReference}-${index}.webp`}
                alt=""
                key={index}
              />
            ))}
            {profile.id === "android-rounded" && <span>···</span>}
          </span>
        )}
      </div>
      <div className="status-right" aria-hidden="true">
        {profile.id === "android-rounded" && (
          <>
            <Icon name="moon" className="status-moon" />
            <Icon name="mute" />
          </>
        )}
        {profile.id === "android-classic" && (
          <span className="status-nfc">N</span>
        )}
        {(profile.id === "android-classic" ||
          profile.id === "android-buttons") && <Icon name="alarm" />}
        {frame.network === "4G + 5G" ? (
          <>
            <span className="status-network">4G</span>
            <Signal />
            <span className="status-network">5G</span>
            <Signal />
          </>
        ) : frame.network === "Wi-Fi" ? (
          <>
            <Icon name="wifi" />
            <Signal />
          </>
        ) : (
          <>
            <span className="status-network">{frame.network}</span>
            <Signal />
          </>
        )}
        <span
          className="battery"
          style={{ "--charge": `${frame.battery}%` } as CSSProperties}
        >
          <span>{frame.battery}</span>
        </span>
      </div>
    </div>
  );
}

function layoutStyle(
  profile: StyleProfile,
  typography: TypographySettings,
): CSSProperties {
  const styles: Record<string, string | number> = {
    "--screen-width": `${profile.width}px`,
    "--screen-height": `${profile.height}px`,
    "--screen-font": typography.font
      ? '"User Moment Font", "Moment Sans", sans-serif'
      : '"Moment Sans", "Microsoft YaHei", sans-serif',
    "--body-weight": typography.weight,
  };
  for (const [key, value] of Object.entries(profile.layout) as [
    keyof Layout,
    number,
  ][]) {
    let adjusted = value;
    if (key === "bodySize") adjusted += typography.sizeOffset;
    if (key === "bodyLine") adjusted += typography.lineOffset;
    styles[
      `--${key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)}`
    ] = `${adjusted}px`;
  }
  return styles as CSSProperties;
}

export const Screen = forwardRef<HTMLDivElement, ScreenProps>(function Screen(
  { profile, moment, frame, typography },
  ref,
) {
  return (
    <div
      ref={ref}
      className="moment-screen"
      data-profile={profile.id}
      data-mode={frame.mode}
      style={layoutStyle(profile, typography)}
      aria-label={`${profile.label}朋友圈详情预览`}
    >
      <StatusBar profile={profile} frame={frame} />
      <header className="screen-header">
        <span>
          <Icon name="back" />
        </span>
        <strong>详情</strong>
        <span>
          <Icon name="more" />
        </span>
      </header>
      <main className="screen-body">
        <div className="post-grid">
          <img className="post-avatar" src={moment.author.avatar} alt="" />
          <div className="post-content">
            <div className="post-name">
              {moment.author.name}
              {moment.author.badge === "plane" && (
                <span className="name-badge">
                  <Icon name="plane" />
                </span>
              )}
            </div>
            {moment.body && (
              <div className="post-copy">{linkedText(moment.body)}</div>
            )}
            {moment.card.visible && (
              <div className="link-card">
                <img src={moment.card.cover} alt="" />
                <div className="link-title">{moment.card.title}</div>
              </div>
            )}
            {moment.location && (
              <div className="post-location">{moment.location}</div>
            )}
            <div className="post-meta">
              <div className="meta-left">
                <span>{moment.postTime}</span>
                <span className="operation-icons">
                  {moment.operations.pin && <Icon name="pin" />}
                  {moment.operations.people && <Icon name="people" />}
                  {moment.operations.delete && <Icon name="trash" />}
                </span>
              </div>
              <span className="post-more">
                <Icon name="more-small" />
              </span>
            </div>
          </div>
        </div>
        {(moment.likes.length > 0 || moment.comments.length > 0) && (
          <section className="interaction-box" aria-label="点赞和评论">
            {moment.likes.length > 0 && (
              <div className="likes-row">
                <div className="interaction-symbol">
                  <Icon name="heart" />
                </div>
                <div className="likes-grid">
                  {moment.likes.map((person) => (
                    <img
                      key={person.id}
                      src={person.avatar}
                      alt={person.name}
                    />
                  ))}
                </div>
              </div>
            )}
            {moment.comments.length > 0 && (
              <div
                className={`comment-section ${moment.likes.length ? "" : "without-likes"}`}
              >
                <div className="interaction-symbol">
                  <Icon name="comment" />
                </div>
                <div className="screen-comments">
                  {moment.comments.map((comment) => (
                    <div className="screen-comment" key={comment.id}>
                      <img src={comment.avatar} alt="" />
                      <div className="comment-main">
                        <div className="comment-heading">
                          <span className="comment-name">{comment.name}</span>
                          <span className="comment-time">{comment.time}</span>
                        </div>
                        <div className="comment-copy">
                          {comment.reply && (
                            <>
                              回复{" "}
                              <span className="linked-text">
                                {comment.reply}
                              </span>
                              ：
                            </>
                          )}
                          {linkedText(comment.text)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
      <div className="screen-space" />
      {(frame.showComposer || frame.showNavigation) && (
        <footer className="screen-footer">
          {frame.showComposer && (
            <div className="screen-composer">
              <div className="composer-placeholder">
                <span>发表评论:</span>
                {profile.composer === "microphone" && (
                  <Icon name="microphone" />
                )}
              </div>
              <Icon name="smile" className="composer-symbol" />
              <Icon name="image" className="composer-symbol" />
              {profile.composer === "send" && (
                <span className="send-placeholder">发送</span>
              )}
            </div>
          )}
          {frame.showNavigation && (
            <div
              className={`system-navigation ${profile.navigation === "buttons" ? "three-buttons" : ""} ${profile.navigation === "none" ? "no-indicator" : ""}`}
            >
              {profile.navigation === "buttons" ? (
                <>
                  <Icon name="menu" />
                  <Icon name="home" />
                  <Icon name="return" />
                </>
              ) : profile.navigation === "gesture" ? (
                <span className="gesture-bar" />
              ) : null}
            </div>
          )}
        </footer>
      )}
    </div>
  );
});

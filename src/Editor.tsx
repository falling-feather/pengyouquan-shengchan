import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  defaultTypography,
  MAX_LIKES,
  moveItem,
  resizeLikes,
  type Comment,
  type FrameSettings,
  type MomentDocument,
  type Person,
  type TypographySettings,
} from "./domain";
import { loadFont, loadImage } from "./files";
import { Icon } from "./WechatIcon";

type Setter<T> = Dispatch<SetStateAction<T>>;
type Tab = "content" | "interactions" | "frame";
interface EditorProps {
  tab: Tab;
  setTab: (tab: Tab) => void;
  moment: MomentDocument;
  setMoment: Setter<MomentDocument>;
  frame: FrameSettings;
  setFrame: Setter<FrameSettings>;
  typography: TypographySettings;
  setTypography: Setter<TypographySettings>;
  savedStatus: string;
  onError: (message: string) => void;
  onPendingChange: (change: 1 | -1) => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
function ImagePicker({
  label,
  src,
  onChange,
  onError,
  onPendingChange,
  kind = "avatar",
}: {
  label: string;
  src: string;
  onChange: (src: string) => void;
  onError: (message: string) => void;
  onPendingChange: (change: 1 | -1) => void;
  kind?: "avatar" | "cover" | "tiny";
}) {
  const request = useRef(0);
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const current = ++request.current;
    onPendingChange(1);
    try {
      const image = await loadImage(file, kind === "cover" ? 1024 : 512);
      if (current === request.current) onChange(image);
    } catch (error) {
      if (current === request.current)
        onError(error instanceof Error ? error.message : "图片读取失败。");
    } finally {
      onPendingChange(-1);
      input.value = "";
    }
  }
  return (
    <label className={`image-picker ${kind}`}>
      <img src={src} alt="" />
      <span>
        {kind === "tiny" ? "更换" : kind === "cover" ? "更换封面" : "更换头像"}
      </span>
      <input
        type="file"
        accept="image/*"
        aria-label={label}
        onChange={select}
      />
    </label>
  );
}

export function Editor({
  tab,
  setTab,
  moment,
  setMoment,
  frame,
  setFrame,
  typography,
  setTypography,
  savedStatus,
  onError,
  onPendingChange,
}: EditorProps) {
  const batchInput = useRef<HTMLInputElement>(null);
  const statusInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const fontRequest = useRef(0);
  const statusRequest = useRef(0);
  const [likesBusy, setLikesBusy] = useState(false);
  const tabs: { id: Tab; name: string }[] = [
    { id: "content", name: "动态内容" },
    { id: "interactions", name: "点赞与评论" },
    { id: "frame", name: "画面设置" },
  ];
  function updateComment(id: string, patch: Partial<Comment>) {
    setMoment((current) => ({
      ...current,
      comments: current.comments.map((comment) =>
        comment.id === id ? { ...comment, ...patch } : comment,
      ),
    }));
  }
  async function importLikes(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    if (files.length > MAX_LIKES) {
      onError(`一次最多导入 ${MAX_LIKES} 张点赞头像。`);
      input.value = "";
      return;
    }
    setLikesBusy(true);
    onPendingChange(1);
    try {
      const people: Person[] = [];
      for (const [index, file] of files.entries())
        people.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^.]+$/, ""),
          avatar: await loadImage(file),
        });
      setMoment((current) => ({ ...current, likes: people }));
    } catch (error) {
      onError(error instanceof Error ? error.message : "点赞头像读取失败。");
    } finally {
      setLikesBusy(false);
      onPendingChange(-1);
      input.value = "";
    }
  }
  async function importStatus(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const request = ++statusRequest.current;
    onPendingChange(1);
    setFrame((current) => ({ ...current, showStatus: true }));
    try {
      const statusImage = await loadImage(file, 2048);
      if (request === statusRequest.current)
        setFrame((current) => ({ ...current, statusImage }));
    } catch (error) {
      if (request === statusRequest.current)
        onError(
          error instanceof Error ? error.message : "状态栏图片读取失败。",
        );
    } finally {
      onPendingChange(-1);
      input.value = "";
    }
  }
  async function importFont(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    const request = ++fontRequest.current;
    onPendingChange(1);
    try {
      const font = await loadFont(file);
      if (request === fontRequest.current)
        setTypography((current) => ({ ...current, font }));
    } catch (error) {
      if (request === fontRequest.current)
        onError(error instanceof Error ? error.message : "字体读取失败。");
    } finally {
      onPendingChange(-1);
      input.value = "";
    }
  }
  return (
    <aside className="editor" aria-label="编辑朋友圈内容">
      <div className="editor-head">
        <div>
          <h2>编辑内容</h2>
          <p>内容修改会同步到右侧预览</p>
        </div>
        <span className="live-indicator">
          <i />
          实时预览
        </span>
      </div>
      <div className="editor-tabs" role="tablist" aria-label="编辑分类">
        {tabs.map((item) => (
          <button
            type="button"
            role="tab"
            key={item.id}
            id={`tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
      <section
        className="editor-panel"
        id="panel-content"
        role="tabpanel"
        aria-labelledby="tab-content"
        hidden={tab !== "content"}
      >
        <div className="author-editor">
          <ImagePicker
            label="上传发布者头像"
            src={moment.author.avatar}
            onChange={(avatar) =>
              setMoment((current) => ({
                ...current,
                author: { ...current.author, avatar },
              }))
            }
            onError={onError}
            onPendingChange={onPendingChange}
          />
          <Field label="发布者昵称">
            <input
              value={moment.author.name}
              maxLength={60}
              onChange={(event) =>
                setMoment((current) => ({
                  ...current,
                  author: { ...current.author, name: event.target.value },
                }))
              }
            />
          </Field>
        </div>
        <Field label="朋友圈正文">
          <textarea
            rows={4}
            value={moment.body}
            onChange={(event) =>
              setMoment((current) => ({ ...current, body: event.target.value }))
            }
          />
        </Field>
        <div className="section-heading">
          <h3>链接卡片</h3>
          <Toggle
            label="显示卡片"
            checked={moment.card.visible}
            onChange={(visible) =>
              setMoment((current) => ({
                ...current,
                card: { ...current.card, visible },
              }))
            }
          />
        </div>
        {moment.card.visible && (
          <div className="cover-editor">
            <ImagePicker
              kind="cover"
              label="上传链接卡片封面"
              src={moment.card.cover}
              onChange={(cover) =>
                setMoment((current) => ({
                  ...current,
                  card: { ...current.card, cover },
                }))
              }
              onError={onError}
              onPendingChange={onPendingChange}
            />
            <Field label="卡片标题">
              <textarea
                rows={3}
                value={moment.card.title}
                onChange={(event) =>
                  setMoment((current) => ({
                    ...current,
                    card: { ...current.card, title: event.target.value },
                  }))
                }
              />
            </Field>
          </div>
        )}
        <div className="field-row">
          <Field label="发布时间">
            <input
              value={moment.postTime}
              onChange={(event) =>
                setMoment((current) => ({
                  ...current,
                  postTime: event.target.value,
                }))
              }
              placeholder="昨天 11:30"
            />
          </Field>
          <Field label="位置（可选）">
            <input
              value={moment.location}
              onChange={(event) =>
                setMoment((current) => ({
                  ...current,
                  location: event.target.value,
                }))
              }
              placeholder="例如：杭州"
            />
          </Field>
        </div>
        <div className="section-heading compact-heading">
          <h3>动态附加标记</h3>
        </div>
        <div className="toggle-group">
          <Toggle
            label="置顶图标"
            checked={moment.operations.pin}
            onChange={(pin) =>
              setMoment((current) => ({
                ...current,
                operations: { ...current.operations, pin },
              }))
            }
          />
          <Toggle
            label="人物图标"
            checked={moment.operations.people}
            onChange={(people) =>
              setMoment((current) => ({
                ...current,
                operations: { ...current.operations, people },
              }))
            }
          />
          <Toggle
            label="删除图标"
            checked={moment.operations.delete}
            onChange={(show) =>
              setMoment((current) => ({
                ...current,
                operations: { ...current.operations, delete: show },
              }))
            }
          />
          <Toggle
            label="昵称旁飞机图标"
            checked={moment.author.badge === "plane"}
            onChange={(show) =>
              setMoment((current) => ({
                ...current,
                author: { ...current.author, badge: show ? "plane" : "none" },
              }))
            }
          />
        </div>
        <button
          className="button primary next-button"
          type="button"
          onClick={() => setTab("interactions")}
        >
          编辑点赞与评论 <span aria-hidden="true">→</span>
        </button>
      </section>
      <section
        className="editor-panel"
        id="panel-interactions"
        role="tabpanel"
        aria-labelledby="tab-interactions"
        hidden={tab !== "interactions"}
      >
        <fieldset className="import-lock" disabled={likesBusy}>
          <div className="section-heading">
            <div>
              <h3>点赞头像</h3>
              <p className="help">点击头像更换，使用箭头调整顺序。</p>
            </div>
            <label className="count-input">
              人数
              <input
                type="number"
                min={0}
                max={MAX_LIKES}
                aria-label="点赞人数"
                value={moment.likes.length}
                onChange={(event) => {
                  if (event.target.value !== "")
                    setMoment((current) => ({
                      ...current,
                      likes: resizeLikes(
                        current.likes,
                        Number(event.target.value),
                      ),
                    }));
                }}
              />
            </label>
          </div>
          {moment.likes.length === 0 ? (
            <p className="empty-state">暂无点赞头像</p>
          ) : (
            <div className="like-editor">
              {moment.likes.map((person, index) => (
                <div className="like-item" key={person.id}>
                  <ImagePicker
                    kind="tiny"
                    label={`替换第${index + 1}个点赞头像`}
                    src={person.avatar}
                    onChange={(avatar) =>
                      setMoment((current) => ({
                        ...current,
                        likes: current.likes.map((item) =>
                          item.id === person.id ? { ...item, avatar } : item,
                        ),
                      }))
                    }
                    onError={onError}
                    onPendingChange={onPendingChange}
                  />
                  <div className="like-actions">
                    <button
                      type="button"
                      aria-label={`上移第${index + 1}个点赞头像`}
                      disabled={index === 0}
                      onClick={() =>
                        setMoment((current) => ({
                          ...current,
                          likes: moveItem(current.likes, index, -1),
                        }))
                      }
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      type="button"
                      aria-label={`下移第${index + 1}个点赞头像`}
                      disabled={index === moment.likes.length - 1}
                      onClick={() =>
                        setMoment((current) => ({
                          ...current,
                          likes: moveItem(current.likes, index, 1),
                        }))
                      }
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      type="button"
                      aria-label={`删除第${index + 1}个点赞头像`}
                      onClick={() =>
                        setMoment((current) => ({
                          ...current,
                          likes: current.likes.filter(
                            (item) => item.id !== person.id,
                          ),
                        }))
                      }
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="actions-row">
            <button
              type="button"
              className="button"
              onClick={() => batchInput.current?.click()}
            >
              <Icon name="upload" />
              {likesBusy ? "正在导入头像…" : "批量导入头像"}
            </button>
            <input
              ref={batchInput}
              className="visually-hidden"
              type="file"
              accept="image/*"
              multiple
              aria-label="批量导入点赞头像"
              onChange={importLikes}
            />
            <button
              type="button"
              className="button"
              onClick={() =>
                setMoment((current) => ({
                  ...current,
                  likes: resizeLikes(current.likes, 59),
                }))
              }
            >
              59 个参考点赞
            </button>
          </div>
          <p className="help">
            批量导入会替换当前名单；59 个参考点赞会保留已有头像。
          </p>
          <div className="section-heading comments-heading">
            <h3>
              评论 <span>{moment.comments.length}</span>
            </h3>
            <button
              className="button small"
              type="button"
              onClick={() =>
                setMoment((current) => ({
                  ...current,
                  comments: [
                    ...current.comments,
                    {
                      id: crypto.randomUUID(),
                      name: current.author.name,
                      avatar: current.author.avatar,
                      text: "",
                      time: current.postTime,
                      reply: "",
                    },
                  ],
                }))
              }
            >
              <Icon name="plus" />
              添加评论
            </button>
          </div>
          {moment.comments.length === 0 && (
            <p className="empty-state">暂无评论</p>
          )}
          {moment.comments.map((comment, index) => (
            <div className="comment-editor" key={comment.id}>
              <div className="comment-controls">
                <ImagePicker
                  kind="tiny"
                  label={`替换第${index + 1}条评论头像`}
                  src={comment.avatar}
                  onChange={(avatar) => updateComment(comment.id, { avatar })}
                  onError={onError}
                  onPendingChange={onPendingChange}
                />
                <label className="comment-name-input">
                  <span className="visually-hidden">
                    第{index + 1}条评论昵称
                  </span>
                  <input
                    aria-label={`第${index + 1}条评论昵称`}
                    value={comment.name}
                    placeholder="评论者昵称"
                    onChange={(event) =>
                      updateComment(comment.id, { name: event.target.value })
                    }
                  />
                </label>
                <div className="comment-order">
                  <button
                    type="button"
                    aria-label={`上移第${index + 1}条评论`}
                    disabled={index === 0}
                    onClick={() =>
                      setMoment((current) => ({
                        ...current,
                        comments: moveItem(current.comments, index, -1),
                      }))
                    }
                  >
                    <Icon name="up" />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移第${index + 1}条评论`}
                    disabled={index === moment.comments.length - 1}
                    onClick={() =>
                      setMoment((current) => ({
                        ...current,
                        comments: moveItem(current.comments, index, 1),
                      }))
                    }
                  >
                    <Icon name="down" />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除第${index + 1}条评论`}
                    onClick={() =>
                      setMoment((current) => ({
                        ...current,
                        comments: current.comments.filter(
                          (item) => item.id !== comment.id,
                        ),
                      }))
                    }
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
              <Field label={`第${index + 1}条评论内容`}>
                <textarea
                  rows={2}
                  value={comment.text}
                  onChange={(event) =>
                    updateComment(comment.id, { text: event.target.value })
                  }
                />
              </Field>
              <div className="field-row">
                <Field label="评论时间">
                  <input
                    aria-label={`第${index + 1}条评论时间`}
                    value={comment.time}
                    onChange={(event) =>
                      updateComment(comment.id, { time: event.target.value })
                    }
                  />
                </Field>
                <Field label="回复对象（可选）">
                  <input
                    aria-label={`第${index + 1}条评论回复对象`}
                    value={comment.reply}
                    placeholder="昵称"
                    onChange={(event) =>
                      updateComment(comment.id, { reply: event.target.value })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </fieldset>
      </section>
      <section
        className="editor-panel"
        id="panel-frame"
        role="tabpanel"
        aria-labelledby="tab-frame"
        hidden={tab !== "frame"}
      >
        <div className="section-heading">
          <h3>状态栏</h3>
          <Toggle
            label="显示状态栏"
            checked={frame.showStatus}
            onChange={(showStatus) =>
              setFrame((current) => ({ ...current, showStatus }))
            }
          />
        </div>
        <div className="field-row">
          <Field label="截图时间">
            <input
              value={frame.clock}
              onChange={(event) =>
                setFrame((current) => ({
                  ...current,
                  clock: event.target.value,
                }))
              }
              maxLength={8}
            />
          </Field>
          <Field label="电量（%）">
            <input
              type="number"
              min={0}
              max={100}
              value={frame.battery}
              onChange={(event) =>
                setFrame((current) => ({
                  ...current,
                  battery: Math.max(
                    0,
                    Math.min(100, Number(event.target.value) || 0),
                  ),
                }))
              }
            />
          </Field>
        </div>
        <Field label="网络显示">
          <select
            value={frame.network}
            onChange={(event) =>
              setFrame((current) => ({
                ...current,
                network: event.target.value as FrameSettings["network"],
              }))
            }
          >
            <option>5G</option>
            <option>5GA</option>
            <option>4G</option>
            <option>4G + 5G</option>
            <option>Wi-Fi</option>
          </select>
        </Field>
        <Toggle
          label="显示通知图标"
          checked={frame.showNotifications}
          onChange={(showNotifications) =>
            setFrame((current) => ({ ...current, showNotifications }))
          }
        />
        <div className="actions-row padded-actions">
          <button
            className="button"
            type="button"
            onClick={() => statusInput.current?.click()}
          >
            <Icon name="upload" />
            上传状态栏图片
          </button>
          {frame.statusImage && (
            <button
              className="button"
              type="button"
              onClick={() => {
                statusRequest.current++;
                setFrame((current) => ({ ...current, statusImage: null }));
              }}
            >
              恢复绘制状态栏
            </button>
          )}
          <input
            ref={statusInput}
            type="file"
            accept="image/*"
            className="visually-hidden"
            aria-label="上传状态栏图片"
            onChange={importStatus}
          />
        </div>
        {frame.statusImage && (
          <p className="help">使用图片时，状态栏的时间和图标以图片内容为准。</p>
        )}
        <div className="divider" />
        <h3 className="subheading">底部区域</h3>
        <div className="toggle-list">
          <Toggle
            label="显示评论输入栏"
            checked={frame.showComposer}
            onChange={(showComposer) =>
              setFrame((current) => ({ ...current, showComposer }))
            }
          />
          <Toggle
            label="显示系统导航区域"
            checked={frame.showNavigation}
            onChange={(showNavigation) =>
              setFrame((current) => ({ ...current, showNavigation }))
            }
          />
        </div>
        <div className="divider" />
        <h3 className="subheading">字体微调</h3>
        <p className="help type-help">
          根据参考手机调整正文大小、行距，也可使用自己的字体文件。
        </p>
        <div className="field-row">
          <Field
            label={`正文大小 ${typography.sizeOffset >= 0 ? "+" : ""}${typography.sizeOffset} px`}
          >
            <input
              type="range"
              min={-3}
              max={4}
              step={0.5}
              value={typography.sizeOffset}
              onChange={(event) =>
                setTypography((current) => ({
                  ...current,
                  sizeOffset: Number(event.target.value),
                }))
              }
            />
          </Field>
          <Field
            label={`正文行距 ${typography.lineOffset >= 0 ? "+" : ""}${typography.lineOffset} px`}
          >
            <input
              type="range"
              min={-3}
              max={6}
              step={0.5}
              value={typography.lineOffset}
              onChange={(event) =>
                setTypography((current) => ({
                  ...current,
                  lineOffset: Number(event.target.value),
                }))
              }
            />
          </Field>
        </div>
        <Field label="正文粗细">
          <select
            value={typography.weight}
            onChange={(event) =>
              setTypography((current) => ({
                ...current,
                weight: Number(event.target.value) as 400 | 500,
              }))
            }
          >
            <option value={400}>常规</option>
            <option value={500}>稍粗</option>
          </select>
        </Field>
        <div className="actions-row">
          <button
            className="button"
            type="button"
            onClick={() => fontInput.current?.click()}
          >
            <Icon name="upload" />
            上传字体
          </button>
          <button
            className="button"
            type="button"
            onClick={() => {
              fontRequest.current++;
              setTypography({ ...defaultTypography });
            }}
          >
            恢复默认字体
          </button>
          <input
            ref={fontInput}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            className="visually-hidden"
            aria-label="上传字体"
            onChange={importFont}
          />
        </div>
        <p className="help">
          当前字体：{typography.font?.label ?? "内置 Noto Sans SC"}
        </p>
      </section>
      <div className="editor-footer">
        <span aria-live="polite">{savedStatus}</span>
        <span>本地草稿</span>
      </div>
    </aside>
  );
}

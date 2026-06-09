import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Ban,
  Check,
  Clock3,
  Github,
  Inbox,
  Languages,
  ListChecks,
  LogOut,
  MessageSquareText,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  Sun,
  Tags,
  Trash2,
  UserCircle,
  UserPlus,
  Users,
  Webhook
} from "lucide-react";
import "./styles.css";

type TaskKind = "choice" | "text" | "image_review" | "steps";
type View = "inbox" | "trash" | "directory" | "tags" | "agent" | "webhooks" | "settings";

type HumanRequest = {
  id: string;
  kind: TaskKind;
  title: string;
  prompt: string;
  choices: string[];
  image_url?: string | null;
  image_base64?: string | null;
  image_mime_type?: string | null;
  steps: string[];
  created_at: number;
  timeout_seconds: number;
  expires_at: number;
  tags: string[];
};

type ExpiredRequest = {
  request: HumanRequest;
  expired_at: number;
  reason: string;
};

type User = {
  email: string;
  provider: "password" | "github";
};

type UserProfile = {
  email: string;
  provider: "password" | "github";
  profile: string;
  tags: string[];
  online: boolean;
  last_login_at: number;
  ban_expires_at?: number | null;
};

type TagStat = {
  tag: string;
  count: number;
};

type OAuthChannelConfig = {
  provider: string;
  enabled: boolean;
  client_id: string;
  client_secret?: string;
};

type AuthConfig = {
  github_enabled: boolean;
  allow_registration?: boolean;
  oauth_channels?: OAuthChannelConfig[];
};

type WebhookConfig = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  secret?: string | null;
  kind: "generic" | "wechat_clawbot" | string;
};

type AdminSettings = {
  allow_registration: boolean;
  oauth_channels: OAuthChannelConfig[];
  agent_secret?: string | null;
  webhooks?: WebhookConfig[];
};

type AgentAccess = {
  user: string;
  mcp_url: string;
  secret_required: boolean;
  agent_secret: string;
};

const tokenKey = "humen-mcp-token";
const preferencesKey = "humen-mcp-preferences";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");

type Theme = "light" | "dark";
type Language = "zh" | "en";

type Preferences = {
  displayName: string;
  avatarText: string;
  avatarColor: string;
  theme: Theme;
  language: Language;
  compact: boolean;
};

const defaultPreferences: Preferences = {
  displayName: "",
  avatarText: "",
  avatarColor: "#2e7a55",
  theme: "light",
  language: "zh",
  compact: false
};

const profileTemplate = `Hi, I can help with human-in-the-loop checks.

Skills: #review #ops #qa
Available for: approvals, UI checks, account actions, short research
Language/timezone:
Escalation notes:`;

const oauthPresets = [
  {
    provider: "github",
    label: "GitHub",
    docsUrl: "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app"
  },
  {
    provider: "google",
    label: "Google",
    docsUrl: "https://developers.google.com/identity/protocols/oauth2/web-server"
  },
  {
    provider: "microsoft",
    label: "Microsoft",
    docsUrl: "https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app"
  },
  {
    provider: "gitlab",
    label: "GitLab",
    docsUrl: "https://docs.gitlab.com/integration/oauth_provider/"
  }
];

const zhText: Record<string, string> = {
  online: "在线",
  refresh: "刷新",
  inbox: "收件箱",
  trash: "回收站",
  directory: "用户目录",
  tags: "标签",
  agent: "接入 Agent",
  adminSettings: "管理与设置",
  settings: "设置",
  noPending: "暂无待处理信封",
  trashEmpty: "回收站为空",
  noExpired: "没有过期信封",
  waiting: "等待 agent 请求",
  email: "邮箱",
  password: "密码",
  adminSignIn: "管理员登录",
  adminLoginFailed: "管理员登录失败",
  administrator: "管理员",
  human: "用户",
  user: "用户",
  light: "亮色",
  dark: "暗色",
  switchDark: "切换到暗色",
  switchLight: "切换到亮色",
  logout: "退出登录",
  answer: "回答",
  note: "备注",
  sendAnswer: "发送回答",
  timeout: "超时",
  expired: "已过期",
  clear: "清空",
  humans: "用户",
  searchProfile: "搜索简介或 #标签",
  noHumans: "没有找到用户",
  noTags: "暂无标签",
  profileMissing: "暂无简介",
  onlineStatus: "在线",
  offlineStatus: "离线",
  settingsSubtitle: "主题、语言和个人显示偏好",
  adminSubtitle: "个性化、OAuth、注册和用户管理",
  updatePanel: "更新面板",
  update: "更新",
  personalization: "个性化",
  displayName: "显示名",
  avatarText: "头像文字",
  avatarColor: "头像颜色",
  compact: "紧凑模式",
  reset: "重置",
  publicProfile: "个人简介",
  profileHelp: "Agent 可以搜索这个简介和 #标签，建议说明能力、可用时间和注意事项。",
  profile: "简介",
  useTemplate: "使用模板",
  saveProfile: "保存简介",
  savingProfile: "正在保存简介...",
  profileSaved: "简介已保存。",
  saveProfileFailed: "保存简介失败",
  registration: "注册",
  allowNewUsers: "允许新用户注册",
  oauthChannels: "OAuth 渠道",
  oauthHelp: "通用 OAuth 渠道。把回调 URL 填到对应 OAuth App 的 Callback/Redirect URI。",
  callbackExample: "回调 URL 示例：",
  addChannel: "添加渠道",
  enabled: "启用",
  save: "保存",
  remove: "移除",
  saved: "已保存。",
  saving: "正在保存...",
  saveFailed: "保存失败。",
  users: "用户",
  saveUserProfile: "保存用户简介",
  banUntil: "封禁到",
  set: "设置",
  unban: "解封",
  kick: "踢出",
  agentTitle: "接入 Agent",
  agentSubtitle: "把 humen-mcp 添加到 Codex、Claude Code 或任何支持 MCP 的 Agent 软件。",
  publicMcp: "当前公开访问，不需要 Agent Secret。",
  secretMcp: "当前需要 Agent Secret。",
  adminAgentSecret: "管理员：Agent Secret",
  agentSecretHelp: "全局唯一。留空表示 MCP endpoint 公开；填写后 Agent 请求必须带这个 secret。",
  random: "随机生成",
  saveSecret: "保存 secret",
  savingAgent: "正在保存 Agent 访问配置...",
  agentSaved: "Agent 访问配置已保存。",
  configExamples: "配置示例",
  copyInstallPromptHelp: "复制安装提示词，直接粘贴给 Codex / Claude Code / 其他 Agent。",
  copyInstallPrompt: "一键复制安装提示词",
  installPrompt: "安装提示词",
  copied: "已复制。",
  copyFailed: "复制失败，请手动选择复制。",
  oauthGuide: "OAuth 配置步骤指南",
  commonFlow: "通用流程",
  currentCallbacks: "当前回调地址",
  presetDocs: "预设平台入口",
  providerNotes: "Provider 注意事项",
  importantNotes: "重要注意事项"
};

const enText: Record<string, string> = {
  online: "online",
  refresh: "Refresh",
  inbox: "Inbox",
  trash: "Trash",
  directory: "Directory",
  tags: "Tags",
  agent: "Connect Agent",
  adminSettings: "Admin & Settings",
  settings: "Settings",
  noPending: "No pending envelopes",
  trashEmpty: "Trash is empty",
  noExpired: "No expired envelopes",
  waiting: "Waiting for agent requests",
  email: "Email",
  password: "Password",
  adminSignIn: "Admin sign in",
  adminLoginFailed: "Admin login failed",
  administrator: "Administrator",
  human: "Human",
  user: "User",
  light: "Light",
  dark: "Dark",
  switchDark: "Switch to dark mode",
  switchLight: "Switch to light mode",
  logout: "Log out",
  answer: "Answer",
  note: "Note",
  sendAnswer: "Send answer",
  timeout: "timeout",
  expired: "expired",
  clear: "Clear",
  humans: "Humans",
  searchProfile: "Search profile or #tag",
  noHumans: "No humans found",
  noTags: "No tags yet",
  profileMissing: "No profile",
  onlineStatus: "online",
  offlineStatus: "offline",
  settingsSubtitle: "Theme, language, and personal display preferences",
  adminSubtitle: "Personalization, OAuth, registration, and user management",
  updatePanel: "Refresh panel",
  update: "Refresh",
  personalization: "Personalization",
  displayName: "Display name",
  avatarText: "Avatar text",
  avatarColor: "Avatar color",
  compact: "Compact mode",
  reset: "Reset",
  publicProfile: "Public profile",
  profileHelp: "Agents can search this profile and #tags. Include skills, availability, and notes.",
  profile: "Profile",
  useTemplate: "Use template",
  saveProfile: "Save profile",
  savingProfile: "Saving profile...",
  profileSaved: "Profile saved.",
  saveProfileFailed: "Save profile failed",
  registration: "Registration",
  allowNewUsers: "Allow new users",
  oauthChannels: "OAuth Channels",
  oauthHelp: "Generic OAuth channels. Put the callback URL into the provider's Callback/Redirect URI.",
  callbackExample: "Callback URL example:",
  addChannel: "Add channel",
  enabled: "Enabled",
  save: "Save",
  remove: "Remove",
  saved: "Saved.",
  saving: "Saving...",
  saveFailed: "Save failed.",
  users: "Users",
  saveUserProfile: "Save user profile",
  banUntil: "Ban until",
  set: "Set",
  unban: "Unban",
  kick: "Kick",
  agentTitle: "Connect Agent",
  agentSubtitle: "Add humen-mcp to Codex, Claude Code, or any MCP-capable agent.",
  publicMcp: "This MCP endpoint is public. No Agent Secret is required.",
  secretMcp: "This MCP endpoint requires an Agent Secret.",
  adminAgentSecret: "Admin: Agent Secret",
  agentSecretHelp: "Global secret. Empty means public MCP endpoint; non-empty requires agents to send this secret.",
  random: "Random",
  saveSecret: "Save secret",
  savingAgent: "Saving agent access...",
  agentSaved: "Agent access saved.",
  configExamples: "Configuration examples",
  copyInstallPromptHelp: "Copy this install prompt and paste it into Codex / Claude Code / another agent.",
  copyInstallPrompt: "Copy install prompt",
  installPrompt: "Install prompt",
  copied: "Copied.",
  copyFailed: "Copy failed. Please select and copy manually.",
  oauthGuide: "OAuth setup guide",
  commonFlow: "Common flow",
  currentCallbacks: "Current callback URLs",
  presetDocs: "Provider docs",
  providerNotes: "Provider notes",
  importantNotes: "Important notes"
};

function t(key: string) {
  return (currentLanguage() === "en" ? enText : zhText)[key] ?? key;
}

function currentLanguage(): Language {
  try {
    return (JSON.parse(localStorage.getItem(preferencesKey) ?? "{}").language as Language) || "zh";
  } catch {
    return "zh";
  }
}

function apiPath(path: string) {
  return `${base}${path}`;
}

function wsPath(token: string) {
  const url = new URL(apiPath(`/api/ws?token=${encodeURIComponent(token)}`), window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? "");
  const [preferences, setPreferences] = usePreferences();
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("inbox");
  const [requests, setRequests] = useState<HumanRequest[]>([]);
  const [trash, setTrash] = useState<ExpiredRequest[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);
  const [directory, setDirectory] = useState<UserProfile[]>([]);
  const [tagStats, setTagStats] = useState<TagStat[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserProfile[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const now = useNow();

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.dataset.compact = preferences.compact ? "true" : "false";
    document.documentElement.lang = preferences.language;
  }, [preferences.theme, preferences.compact, preferences.language]);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? requests[0] ?? null,
    [requests, selectedId]
  );

  useEffect(() => {
    const fromOAuth = new URLSearchParams(window.location.search).get("token");
    if (fromOAuth) {
      localStorage.setItem(tokenKey, fromOAuth);
      setToken(fromOAuth);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(apiPath("/api/me"), { headers: authHeaders(token) })
      .then((response) => {
        if (!response.ok) throw new Error("unauthorized");
        return response.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => logout(setToken, setUser, setRequests, setTrash));
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;
    refreshAll();
    const ws = new WebSocket(wsPath(token));
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "snapshot") {
        setRequests(sortRequests(message.requests ?? []));
        setOnlineCount(message.online_count ?? 0);
      }
      if (message.type === "request_created") {
        setRequests((current) => upsertRequest(current, message.request));
      }
      if (message.type === "request_answered") {
        setRequests((current) => current.filter((request) => request.id !== message.id));
      }
      if (message.type === "request_expired") {
        setRequests((current) => current.filter((request) => request.id !== message.id));
        setTrash((current) => sortTrash([message.expired_request, ...current]));
      }
      if (message.type === "trash_cleaned") {
        refreshTrash(token, setTrash);
      }
      if (message.type === "presence_changed") {
        setOnlineCount(message.online_count);
        refreshUsers(token, setOnlineUsers, setDirectory, setTagStats);
      }
    };
    return () => ws.close();
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    const handle = window.setTimeout(() => {
      refreshDirectory(token, setDirectory, query);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, token, user]);

  function refreshAll() {
    if (!token) return;
    setBusy(true);
    Promise.all([
      refreshRequests(token, setRequests),
      refreshTrash(token, setTrash),
      refreshUsers(token, setOnlineUsers, setDirectory, setTagStats),
      refreshAdmin(token, setIsAdmin, setAdminUsers, setAdminSettings)
    ]).finally(() => setBusy(false));
  }

  if (!token || !user) {
    return <Login onToken={setToken} />;
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div>
            <h1>humen-mcp</h1>
            <p>{onlineCount} {t(t("onlineStatus"))}</p>
          </div>
          <button className="iconButton" title={t("refresh")} onClick={refreshAll}>
            <RefreshCw size={18} className={busy ? "spin" : ""} />
          </button>
        </div>

        <nav className="navList">
          <NavButton icon={<Inbox size={18} />} label={t("inbox")} count={requests.length} active={view === "inbox"} onClick={() => setView("inbox")} />
          <NavButton icon={<Trash2 size={18} />} label={t("trash")} count={trash.length} active={view === "trash"} onClick={() => setView("trash")} />
          <NavButton icon={<Users size={18} />} label={t("directory")} count={onlineUsers.length} active={view === "directory"} onClick={() => setView("directory")} />
          <NavButton icon={<Tags size={18} />} label={t("tags")} count={tagStats.length} active={view === "tags"} onClick={() => setView("tags")} />
          <NavButton icon={<MessageSquareText size={18} />} label={t("agent")} active={view === "agent"} onClick={() => setView("agent")} />
          <NavButton icon={isAdmin ? <Shield size={18} /> : <Settings size={18} />} label={isAdmin ? t("adminSettings") : t("settings")} active={view === "settings"} onClick={() => setView("settings")} />
        </nav>

        {view === "inbox" && (
          <div className="requestList">
            {requests.map((request) => (
              <EnvelopeButton
                key={request.id}
                request={request}
                now={now}
                active={selected?.id === request.id}
                onClick={() => setSelectedId(request.id)}
              />
            ))}
            {requests.length === 0 && <div className="empty">{t("noPending")}</div>}
          </div>
        )}

        {view === "trash" && (
          <div className="requestList">
            {trash.map((entry) => (
              <button key={entry.request.id} className="requestItem expired">
                <Trash2 size={18} />
                <span>
                  <strong>{entry.request.title}</strong>
                  <small>{formatAge(now - entry.expired_at)} {currentLanguage() === "zh" ? "前" : "ago"}</small>
                </span>
              </button>
            ))}
            {trash.length === 0 && <div className="empty">{t("trashEmpty")}</div>}
          </div>
        )}

        {isAdmin && (
          <div className="sidebarActions">
            <button className={`addWebhookButton ${view === "webhooks" ? "active" : ""}`} onClick={() => setView("webhooks")}>
              <Plus size={18} />
              <span>新增 webhook</span>
            </button>
          </div>
        )}
      </aside>

      <section className="workspace">
        <TopBar
          user={user}
          preferences={preferences}
          setPreferences={setPreferences}
          isAdmin={isAdmin}
          onSettings={() => setView("settings")}
          onLogout={() => logout(setToken, setUser, setRequests, setTrash)}
        />
        {view === "inbox" && (selected ? <TaskPanel request={selected} token={token} now={now} afterSubmit={() => setSelectedId(null)} /> : <Blank />)}
        {view === "trash" && <TrashView trash={trash} token={token} setTrash={setTrash} />}
        {view === "directory" && <DirectoryView query={query} setQuery={setQuery} users={directory} tags={tagStats} />}
        {view === "tags" && <TagsView tags={tagStats} setQuery={setQuery} setView={setView} />}
        {view === "agent" && (
          <AgentView
            token={token}
            isAdmin={isAdmin}
            settings={adminSettings}
            setSettings={setAdminSettings}
          />
        )}
        {view === "webhooks" && isAdmin && adminSettings && (
          <WebhookView
            token={token}
            settings={adminSettings}
            setSettings={setAdminSettings}
          />
        )}
        {view === "webhooks" && (!isAdmin || !adminSettings) && <Blank text="Only administrators can manage webhooks" />}
        {view === "settings" && isAdmin && (
          adminSettings ? (
            <AdminView
              token={token}
              user={user}
              preferences={preferences}
              setPreferences={setPreferences}
              users={adminUsers}
              settings={adminSettings}
              setUsers={setAdminUsers}
              setSettings={setAdminSettings}
              onRefresh={refreshAll}
              refreshing={busy}
            />
          ) : (
            <AccountView
              token={token}
              user={user}
              preferences={preferences}
              setPreferences={setPreferences}
              onRefresh={refreshAll}
              refreshing={busy}
              notice="Admin APIs are not available on this backend version yet."
            />
          )
        )}
        {view === "settings" && !isAdmin && (
          <AccountView token={token} user={user} preferences={preferences} setPreferences={setPreferences} onRefresh={refreshAll} refreshing={busy} />
        )}
      </section>
    </main>
  );
}

function Login({ onToken }: { onToken: (token: string) => void }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ github_enabled: false, allow_registration: true });

  useEffect(() => {
    fetch(apiPath("/api/auth/config"))
      .then((response) => safeJson<AuthConfig>(response))
      .then((config) => setAuthConfig(config ?? { github_enabled: false, allow_registration: false, oauth_channels: [] }))
      .catch(() => setAuthConfig({ github_enabled: false, allow_registration: false, oauth_channels: [] }));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(apiPath("/api/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, pass })
    });
    if (!response.ok) {
      setError(t("adminLoginFailed"));
      return;
    }
    const data = await response.json();
    localStorage.setItem(tokenKey, data.token);
    onToken(data.token);
  }

  return (
    <main className="loginShell">
      <form className="loginPanel" onSubmit={submit}>
        <h1>humen-mcp</h1>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
        </label>
        <label>
          Password
          <input value={pass} onChange={(event) => setPass(event.target.value)} type="password" autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          <Check size={18} /> {t("adminSignIn")}
        </button>
        <OAuthLoginButtons config={authConfig} />
      </form>
    </main>
  );
}

function OAuthLoginButtons({ config }: { config: AuthConfig }) {
  const channels = (config.oauth_channels ?? [])
    .filter((channel) => channel.enabled)
    .filter((channel, index, all) => all.findIndex((candidate) => candidate.provider === channel.provider) === index);
  const fallback = config.github_enabled ? [{ provider: "github", enabled: true, client_id: "" }] : [];
  const visible = channels.length > 0 ? channels : fallback;
  if (visible.length === 0) return null;

  return (
    <div className="oauthButtons">
      {visible.map((channel) => (
        <a className="oauth" key={channel.provider} href={oauthStartUrl(channel.provider)}>
          {channel.provider === "github" ? <Github size={18} /> : <Shield size={18} />}
          {oauthProviderLabel(channel.provider)}
        </a>
      ))}
    </div>
  );
}

function NavButton({ icon, label, count, active, onClick }: { icon: React.ReactNode; label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button className={`navButton ${active ? "active" : ""}`} onClick={onClick}>
      {icon}
      <span>{label}</span>
      {count !== undefined && <strong>{count}</strong>}
    </button>
  );
}

function EnvelopeButton({ request, now, active, onClick }: { request: HumanRequest; now: number; active: boolean; onClick: () => void }) {
  const expired = now >= request.expires_at;
  return (
    <button className={`requestItem ${active ? "active" : ""} ${expired ? "expired" : ""}`} onClick={onClick}>
      <TaskIcon kind={request.kind} />
      <span>
        <strong>{request.title}</strong>
        <small>
          <Countdown request={request} now={now} />
        </small>
      </span>
    </button>
  );
}

function TopBar({
  user,
  preferences,
  setPreferences,
  isAdmin,
  onSettings,
  onLogout
}: {
  user: User;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
  isAdmin: boolean;
  onSettings: () => void;
  onLogout: () => void;
}) {
  const displayName = preferences.displayName.trim() || user.email;
  return (
    <header className="topbar">
      <div>
        <span className="mode">{isAdmin ? t("administrator") : t("human")}</span>
      </div>
      <div className="userMenu">
        <button
          className="topbarAction"
          title={preferences.theme === "light" ? t("switchDark") : t("switchLight")}
          onClick={() => setPreferences({ ...preferences, theme: preferences.theme === "light" ? "dark" : "light" })}
        >
          {preferences.theme === "light" ? <Sun size={18} /> : <Moon size={18} />}
          <span>{preferences.theme === "light" ? t("light") : t("dark")}</span>
        </button>
        <button
          className="topbarAction langButton"
          title="切换语言 / Switch language"
          onClick={() => setPreferences({ ...preferences, language: preferences.language === "zh" ? "en" : "zh" })}
        >
          <Languages size={18} />
          <span>{preferences.language === "zh" ? "中文" : "English"}</span>
        </button>
        <button className="avatarButton" title={displayName} onClick={onSettings}>
          <UserCircle size={22} />
          <span style={{ background: preferences.avatarColor }}>{avatarText(user, preferences)}</span>
          <small>
            <strong>{t("user")}</strong>
            {displayName}
          </small>
        </button>
        <button className="iconButton" title={t("settings")} onClick={onSettings}>
          <Settings size={18} />
        </button>
        <button className="iconButton" title={t("logout")} onClick={onLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function TaskPanel({ request, token, now, afterSubmit }: { request: HumanRequest; token: string; now: number; afterSubmit: () => void }) {
  const [answer, setAnswer] = useState(request.choices[0] ?? "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const imageSrc = imageSource(request);

  useEffect(() => {
    setAnswer(request.choices[0] ?? "");
    setNote("");
  }, [request.id]);

  async function submit() {
    setSubmitting(true);
    await fetch(apiPath(`/api/requests/${request.id}/answer`), {
      method: "POST",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ answer, note: note || null })
    });
    setSubmitting(false);
    afterSubmit();
  }

  return (
    <article className="task">
      <header className="taskHeader">
        <TaskIcon kind={request.kind} />
        <div>
          <h2>{request.title}</h2>
          <p>{request.prompt}</p>
          <div className="metaRow">
            <span><Clock3 size={15} /> <Countdown request={request} now={now} /></span>
            {request.tags.map((tag) => <span key={tag} className="tagPill">{tag}</span>)}
          </div>
        </div>
      </header>

      {imageSrc && (
        <figure className="imagePreview">
          <img src={imageSrc} alt="" />
        </figure>
      )}

      {request.steps.length > 0 && (
        <ol className="steps">
          {request.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      )}

      {request.choices.length > 0 ? (
        <div className="choices">
          {request.choices.map((choice) => (
            <button key={choice} className={answer === choice ? "chosen" : ""} onClick={() => setAnswer(choice)}>
              {choice}
            </button>
          ))}
        </div>
      ) : (
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder={t("answer")} />
      )}

      <textarea className="note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("note")} />

      <footer>
        <span>{request.timeout_seconds}s {t("timeout")}</span>
        <button className="primary" onClick={submit} disabled={submitting || !answer.trim() || now >= request.expires_at}>
          <Send size={18} /> {t("sendAnswer")}
        </button>
      </footer>
    </article>
  );
}

function TrashView({ trash, token, setTrash }: { trash: ExpiredRequest[]; token: string; setTrash: (trash: ExpiredRequest[]) => void }) {
  async function clear() {
    await fetch(apiPath("/api/trash/clear"), { method: "POST", headers: authHeaders(token) });
    setTrash([]);
  }

  return (
    <section className="page">
      <div className="pageTitle">
        <h2>{t("trash")}</h2>
        <button className="secondary" onClick={clear} disabled={trash.length === 0}>
          <Trash2 size={17} /> {t("clear")}
        </button>
      </div>
      <div className="gridList">
        {trash.map((entry) => (
          <article className="listCard" key={entry.request.id}>
            <div className="cardHead">
              <Trash2 size={18} />
              <strong>{entry.request.title}</strong>
            </div>
            <p>{entry.reason}</p>
            <small>{formatTime(entry.expired_at)}</small>
            <div className="tagRow">{entry.request.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          </article>
        ))}
        {trash.length === 0 && <Blank text={t("noExpired")} />}
      </div>
    </section>
  );
}

function DirectoryView({ query, setQuery, users, tags }: { query: string; setQuery: (query: string) => void; users: UserProfile[]; tags: TagStat[] }) {
  return (
    <section className="page">
      <div className="pageTitle">
        <h2>{t("humans")}</h2>
        <label className="searchBox">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchProfile")} />
        </label>
      </div>
      <div className="tagStrip">
        {tags.slice(0, 10).map((tag) => (
          <button key={tag.tag} onClick={() => setQuery(tag.tag)}>
            {tag.tag} <span>{tag.count}</span>
          </button>
        ))}
      </div>
      <div className="gridList">
        {users.map((profile) => <UserCard key={profile.email} profile={profile} />)}
        {users.length === 0 && <Blank text={t("noHumans")} />}
      </div>
    </section>
  );
}

function TagsView({ tags, setQuery, setView }: { tags: TagStat[]; setQuery: (query: string) => void; setView: (view: View) => void }) {
  return (
    <section className="page">
      <div className="pageTitle">
        <h2>{t("tags")}</h2>
      </div>
      <div className="tagCloud">
        {tags.map((tag) => (
          <button key={tag.tag} onClick={() => { setQuery(tag.tag); setView("directory"); }}>
            {tag.tag}
            <span>{tag.count}</span>
          </button>
        ))}
        {tags.length === 0 && <Blank text={t("noTags")} />}
      </div>
    </section>
  );
}

function AgentView({
  token,
  isAdmin,
  settings,
  setSettings
}: {
  token: string;
  isAdmin: boolean;
  settings: AdminSettings | null;
  setSettings: (settings: AdminSettings | null) => void;
}) {
  const [access, setAccess] = useState<AgentAccess | null>(null);
  const [secretDraft, setSecretDraft] = useState("");
  const [status, setStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    refresh();
  }, [token]);

  useEffect(() => {
    setSecretDraft(settings?.agent_secret ?? "");
  }, [settings?.agent_secret]);

  async function refresh() {
    const data = await fetch(apiPath("/api/agent/access"), { headers: authHeaders(token) }).then((response) => safeJson<AgentAccess>(response));
    if (data) setAccess(data);
  }

  async function saveSecret() {
    if (!settings) return;
    setStatus(t("savingAgent"));
    const next = { ...settings, agent_secret: secretDraft.trim() || null };
    const response = await fetch(apiPath("/api/admin/settings"), {
      method: "POST",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify(next)
    });
    if (!response.ok) {
      setStatus((await safeError(response)) || "Save failed");
      return;
    }
    setSettings(await response.json());
    await refresh();
    setStatus(t("agentSaved"));
  }

  const mcpUrl = normalizeMcpUrl(access?.mcp_url ?? defaultMcpUrl());
  const accessKey = access?.agent_secret ?? "";
  const headerLine = accessKey ? " -H '" + "x-humen-agent-secret" + ": " + accessKey + "'" : "";
  const installPrompt = agentInstallPrompt(mcpUrl, accessKey);
  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>{t("agentTitle")}</h2>
          <p>{t("agentSubtitle")}</p>
        </div>
        <button className="secondary" onClick={refresh}>
          <RefreshCw size={17} /> {t("update")}
        </button>
      </div>

      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle">
            <Shield size={18} />
            <div>
              <h3>MCP Endpoint</h3>
              <p>{access?.secret_required ? t("secretMcp") : t("publicMcp")}</p>
            </div>
          </div>
        </div>
        <label className="copyField">
          <span>URL</span>
          <input value={mcpUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
        </label>
        {accessKey && (
          <label className="copyField">
            <span>Agent Secret</span>
            <input value={accessKey} readOnly onFocus={(event) => event.currentTarget.select()} />
          </label>
        )}
      </section>

      {isAdmin && settings && (
        <section className="panel">
          <div className="panelHead">
            <div className="panelTitle">
              <Settings size={18} />
              <div>
                <h3>{t("adminAgentSecret")}</h3>
                <p>{t("agentSecretHelp")}</p>
              </div>
            </div>
          </div>
          <div className="agentSecretRow">
            <input type="password" value={secretDraft} onChange={(event) => setSecretDraft(event.target.value)} placeholder="Leave empty for public MCP endpoint" />
            <button className="secondary" onClick={() => setSecretDraft(randomSecret())}>
              <RefreshCw size={17} /> {t("random")}
            </button>
            <button className="primary" onClick={saveSecret}>
              <Check size={17} /> {t("saveSecret")}
            </button>
          </div>
          {status && <div className={status.endsWith(".") ? "notice" : "notice warning"}>{status}</div>}
        </section>
      )}

      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle">
            <MessageSquareText size={18} />
            <div>
              <h3>{t("configExamples")}</h3>
              <p>{t("copyInstallPromptHelp")}</p>
            </div>
          </div>
          <button className="primary" onClick={() => copyToClipboard(installPrompt, setCopyStatus)}>
            <Check size={17} /> {t("copyInstallPrompt")}
          </button>
        </div>
        {copyStatus && <div className="inlineStatus">{copyStatus}</div>}
        <div className="guideBody">
          <section>
            <h4>{t("installPrompt")}</h4>
            <pre>{installPrompt}</pre>
          </section>
          <section>
            <h4>通用 MCP JSON（仅用于客户端导入或设置页）</h4>
            <pre>{`{
  "mcpServers": {
    "humen": {
      "url": "${mcpUrl}"${accessKey ? `,
      "headers": {
        "x-humen-agent-secret": "${accessKey}"
      }` : ""}
    }
  }
}`}</pre>
          </section>
          <section>
            <h4>curl 测试</h4>
            <pre>{`curl '${mcpUrl}' \\
  -H 'content-type: application/json'${headerLine ? ` \\
 ${headerLine}` : ""} \\
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'`}</pre>
          </section>
          <section>
            <h4>Codex / Claude / 其他 Agent 客户端</h4>
            <ol>
              <li>优先使用 Codex CLI、Claude CLI 或对应客户端自带的 MCP 添加命令 / 设置页。</li>
              <li>新增一个名为 <code>humen</code> 的 remote/http MCP server。</li>
              <li>URL 填上面的 MCP Endpoint。</li>
              <li>如果显示需要 Secret，在 headers 里加入 <code>x-humen-agent-secret</code>。</li>
              <li>如果当前是 CLI 工具，请用命令行添加；不要直接编辑配置文件。</li>
              <li>保存后重启 Agent，执行 tools/list 确认能看到 ask_humen。</li>
            </ol>
          </section>
        </div>
      </section>
    </section>
  );
}

function WebhookView({
  token,
  settings,
  setSettings
}: {
  token: string;
  settings: AdminSettings;
  setSettings: (settings: AdminSettings | null) => void;
}) {
  const [drafts, setDrafts] = useState<WebhookConfig[]>(() => settings.webhooks ?? []);
  const [status, setStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    setDrafts(settings.webhooks ?? []);
  }, [settings.webhooks]);

  function addWebhook(kind: WebhookConfig["kind"] = "generic") {
    setDrafts((current) => [
      ...current,
      {
        id: randomId(),
        name: kind === "wechat_clawbot" ? "微信 clawbot" : "Webhook",
        url: "",
        enabled: true,
        secret: kind === "wechat_clawbot" ? randomSecret().slice(0, 32) : "",
        kind
      }
    ]);
  }

  function patchWebhook(index: number, patch: Partial<WebhookConfig>) {
    setDrafts((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    setStatus("正在保存 webhooks...");
    const response = await fetch(apiPath("/api/admin/webhooks"), {
      method: "POST",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ webhooks: drafts })
    });
    if (!response.ok) {
      setStatus((await safeError(response)) || "保存失败");
      return;
    }
    const saved = (await response.json()) as WebhookConfig[];
    setDrafts(saved);
    setSettings({ ...settings, webhooks: saved });
    setStatus("已保存。");
  }

  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>Webhooks</h2>
          <p>收到 MCP 消息或微信 clawbot 消息时触发；微信消息会同步进入收件箱。</p>
        </div>
        <div className="rowActions">
          <button className="secondary" onClick={() => addWebhook("wechat_clawbot")}>
            <Plus size={17} /> 微信 clawbot
          </button>
          <button className="secondary" onClick={() => addWebhook("generic")}>
            <Plus size={17} /> 新增 webhook
          </button>
          <button className="primary" onClick={save}>
            <Check size={17} /> 保存
          </button>
        </div>
      </div>

      {status && <div className={status === "已保存。" ? "notice" : "notice warning"}>{status}</div>}

      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle">
            <Webhook size={18} />
            <div>
              <h3>触发规则</h3>
              <p>Generic：ask_humen 创建消息时 POST 到目标 URL；微信 clawbot：ClawBot POST 到内置入口后创建消息并触发目标 URL。</p>
            </div>
          </div>
        </div>
        <pre>{`POST payload:
{
  "event": "request_created" | "message_received",
  "source": "mcp" | "wechat_clawbot",
  "request": { ...HumanRequest },
  "raw": { ...incomingMessage }
}`}</pre>
      </section>

      <div className="webhookList">
        {drafts.map((webhook, index) => {
          const incomingUrl = clawbotIncomingUrl(webhook.id, webhook.secret ?? "");
          return (
            <article className="oauthCard webhookCard" key={webhook.id}>
              <div className="oauthCardGrid webhookGrid">
                <label>
                  <span>名称</span>
                  <input value={webhook.name} onChange={(event) => patchWebhook(index, { name: event.target.value })} />
                </label>
                <label>
                  <span>类型</span>
                  <select value={webhook.kind} onChange={(event) => patchWebhook(index, { kind: event.target.value })}>
                    <option value="generic">Generic webhook</option>
                    <option value="wechat_clawbot">个人微信 IM（ClawBot）</option>
                  </select>
                </label>
                <label>
                  <span>目标 URL（可选）</span>
                  <input value={webhook.url} onChange={(event) => patchWebhook(index, { url: event.target.value })} placeholder="https://example.com/webhook" />
                </label>
                <label>
                  <span>Secret</span>
                  <input type="password" value={webhook.secret ?? ""} onChange={(event) => patchWebhook(index, { secret: event.target.value })} placeholder="用于签名/ClawBot 入口校验" />
                </label>
              </div>

              {webhook.kind === "wechat_clawbot" && (
                <label className="copyField">
                  <span>ClawBot 收消息入口</span>
                  <div className="copyLine">
                    <input value={incomingUrl} readOnly onFocus={(event) => event.currentTarget.select()} />
                    <button className="secondary" onClick={() => copyToClipboard(incomingUrl, setCopyStatus)}>
                      <Check size={16} /> 复制
                    </button>
                  </div>
                  <small>把此 URL 配到微信 ClawBot 的消息回调；也可用请求头 x-humen-webhook-secret 传 Secret。</small>
                </label>
              )}

              <div className="oauthActions">
                <label className="toggleRow compact">
                  <span>启用</span>
                  <input type="checkbox" checked={webhook.enabled} onChange={(event) => patchWebhook(index, { enabled: event.target.checked })} />
                </label>
                <button className="secondary" onClick={() => patchWebhook(index, { secret: randomSecret().slice(0, 32) })}>
                  <RefreshCw size={16} /> 生成 Secret
                </button>
                <button className="secondary" onClick={() => setDrafts((current) => current.filter((item) => item.id !== webhook.id))}>
                  <Trash2 size={16} /> 移除
                </button>
              </div>
            </article>
          );
        })}
        {drafts.length === 0 && <Blank text="点击左上角或左下角的加号新增 webhook" />}
      </div>
      {copyStatus && <div className="inlineStatus">{copyStatus}</div>}
    </section>
  );
}

function AdminView({
  token,
  user,
  preferences,
  setPreferences,
  users,
  settings,
  setUsers,
  setSettings,
  onRefresh,
  refreshing
}: {
  token: string;
  user: User;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
  users: UserProfile[];
  settings: AdminSettings;
  setUsers: (users: UserProfile[]) => void;
  setSettings: (settings: AdminSettings) => void;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const [oauthProvider, setOauthProvider] = useState("");
  const [oauthClientId, setOauthClientId] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [oauthStatus, setOauthStatus] = useState<Record<string, string>>({});

  async function saveSettings(next: AdminSettings) {
    setSettingsStatus(t("saving"));
    setSettings(next);
    try {
      const response = await fetch(apiPath("/api/admin/settings"), {
        method: "POST",
        headers: { ...authHeaders(token), "content-type": "application/json" },
        body: JSON.stringify(next)
      });
      if (!response.ok) {
        setSettingsStatus((await safeError(response)) || "Save failed");
        return false;
      }
      setSettings(mergeOAuthSecrets(await response.json(), next));
      setSettingsStatus(t("saved"));
      return true;
    } catch (err) {
      setSettingsStatus(err instanceof Error ? err.message : "Save failed");
      return false;
    }
  }

  async function saveOAuthSettings(next: AdminSettings, provider: string) {
    const key = normalizeOAuthProvider(provider);
    setOauthStatus((current) => ({ ...current, [key]: t("saving") }));
    const ok = await saveSettings(next);
    setOauthStatus((current) => ({ ...current, [key]: ok ? t("saved") : t("saveFailed") }));
  }

  function addOAuthChannel(event: FormEvent) {
    event.preventDefault();
    const provider = normalizeOAuthProvider(oauthProvider);
    if (!provider) return;
    upsertOAuthChannel(provider, oauthClientId.trim(), false);
    setOauthProvider("");
    setOauthClientId("");
  }

  function upsertOAuthChannel(provider: string, clientId = "", enabled = false) {
    const normalized = normalizeOAuthProvider(provider);
    if (!normalized) return;
    const nextChannels = settings.oauth_channels.filter((channel) => channel.provider !== normalized);
    nextChannels.push({ provider: normalized, enabled, client_id: clientId, client_secret: "" });
    saveSettings({ ...settings, oauth_channels: nextChannels });
  }

  return (
    <section className="page adminPage">
      <div className="pageTitle">
        <div>
          <h2>{t("settings")}</h2>
          <p>{t("adminSubtitle")}</p>
        </div>
        <button className="secondary" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? "spin" : ""} /> {t("updatePanel")}
        </button>
      </div>

      <PersonalizationPanel user={user} preferences={preferences} setPreferences={setPreferences} />
      <ProfilePanel token={token} />
      {settingsStatus && <div className={settingsStatus === t("saved") ? "notice" : "notice warning"}>{settingsStatus}</div>}

      <section className="panel">
        <div className="panelHead">
          <Shield size={18} />
          <h3>{t("registration")}</h3>
        </div>
        <label className="toggleRow">
          <span>{t("allowNewUsers")}</span>
          <input
            type="checkbox"
            checked={settings.allow_registration}
            onChange={(event) => saveSettings({ ...settings, allow_registration: event.target.checked })}
          />
        </label>
      </section>

      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle">
            <Github size={18} />
            <div>
              <h3>{t("oauthChannels")}</h3>
              <p>{t("oauthHelp")}</p>
            </div>
          </div>
          <button className="secondary small" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> {t("update")}
          </button>
        </div>

        <div className="oauthPresetRow">
          {oauthPresets.map((preset) => {
            const exists = settings.oauth_channels.some((channel) => channel.provider === preset.provider);
            return (
              <button
                className="secondary small"
                key={preset.provider}
                onClick={() => upsertOAuthChannel(preset.provider)}
                disabled={exists}
              >
                <UserPlus size={15} /> {exists ? `${preset.label} added` : `Add ${preset.label}`}
              </button>
            );
          })}
        </div>

        <div className="oauthCallbackHint">
          <strong>{t("callbackExample")}</strong>
          <code>{oauthCallbackUrl("github")}</code>
        </div>

        <OAuthSetupGuide channels={settings.oauth_channels} />

        {settings.oauth_channels.map((channel, index) => (
          <div className="oauthCard" key={`${channel.provider}-${index}`}>
            <div className="oauthCardGrid">
              <label>
                <span>Provider</span>
                <input value={oauthProviderLabel(channel.provider)} readOnly />
              </label>
              <label>
                <span>Client ID</span>
                <input
                  value={channel.client_id}
                  onChange={(event) => {
                    const next = [...settings.oauth_channels];
                    next[index] = { ...channel, client_id: event.target.value };
                    setSettings({ ...settings, oauth_channels: next });
                  }}
                  placeholder="OAuth Client ID"
                />
              </label>
              <label>
                <span>Client Secret</span>
                <input
                  type="password"
                  value={channel.client_secret ?? ""}
                  onChange={(event) => {
                    const next = [...settings.oauth_channels];
                    next[index] = { ...channel, client_secret: event.target.value };
                    setSettings({ ...settings, oauth_channels: next });
                  }}
                  placeholder="OAuth Client Secret"
                  autoComplete="off"
                />
              </label>
              <label>
                <span>Callback / Redirect URI</span>
                <input
                  value={oauthCallbackUrl(channel.provider)}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
            </div>
            <div className="oauthActions">
              <label className="toggleRow compact">
                <span>{t("enabled")}</span>
              <input
                  type="checkbox"
                  checked={channel.enabled}
                  onChange={(event) => {
                    const next = [...settings.oauth_channels];
                    next[index] = { ...channel, enabled: event.target.checked };
                    saveOAuthSettings({ ...settings, oauth_channels: next }, channel.provider);
                  }}
                />
              </label>
              <button
                className="secondary"
                onClick={() => saveOAuthSettings({ ...settings, oauth_channels: settings.oauth_channels }, channel.provider)}
              >
                <Check size={16} /> {t("save")}
              </button>
              <button
                className="secondary"
                onClick={() =>
                  saveSettings({
                    ...settings,
                    oauth_channels: settings.oauth_channels.filter((candidate) => candidate.provider !== channel.provider)
                  })
                }
              >
                <Trash2 size={16} /> {t("remove")}
              </button>
            </div>
            {oauthStatus[channel.provider] && <div className="inlineStatus">{oauthStatus[channel.provider]}</div>}
          </div>
        ))}
        <form className="oauthAddRow" onSubmit={addOAuthChannel}>
          <input value={oauthProvider} onChange={(event) => setOauthProvider(event.target.value)} placeholder="provider, e.g. custom-sso" />
          <input value={oauthClientId} onChange={(event) => setOauthClientId(event.target.value)} placeholder="client id" />
          <button className="secondary" disabled={!oauthProvider.trim()}>
            <UserPlus size={16} /> {t("addChannel")}
          </button>
        </form>
      </section>


      <section className="panel">
        <div className="panelHead">
          <div className="panelTitle">
            <Users size={18} />
            <h3>{t("users")}</h3>
          </div>
          <button className="secondary small" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> {t("update")}
          </button>
        </div>
        <div className="userTable">
          {users.map((profile) => (
            <AdminUserRow key={profile.email} profile={profile} token={token} afterChange={() => refreshAdmin(token, () => {}, setUsers, setSettings)} />
          ))}
        </div>
      </section>
    </section>
  );
}

function AdminUserRow({ profile, token, afterChange }: { profile: UserProfile; token: string; afterChange: () => void }) {
  const [banUntil, setBanUntil] = useState("");
  const [editProfile, setEditProfile] = useState(profile.profile);
  const [editTags, setEditTags] = useState(profile.tags.join(" "));

  async function patch(body: unknown) {
    await fetch(apiPath(`/api/admin/users/${encodeURIComponent(profile.email)}`), {
      method: "POST",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    afterChange();
  }

  async function kick() {
    await fetch(apiPath(`/api/admin/users/${encodeURIComponent(profile.email)}/kick`), {
      method: "POST",
      headers: authHeaders(token)
    });
    afterChange();
  }

  function applyCustomBan() {
    if (!banUntil) return;
    const unix = Math.floor(new Date(banUntil).getTime() / 1000);
    if (Number.isFinite(unix)) {
      patch({ ban_expires_at: unix });
    }
  }

  function saveProfile() {
    patch({ profile: editProfile, tags: splitTags(editTags) });
  }

  return (
    <div className="userRow">
      <UserCard profile={profile} />
      <div className="userEdit">
        <input value={editProfile} onChange={(event) => setEditProfile(event.target.value)} placeholder="profile" />
        <input value={editTags} onChange={(event) => setEditTags(event.target.value)} placeholder="#ops #review" />
        <button className="secondary" onClick={saveProfile}>
          <Check size={16} /> {t("save")} profile
        </button>
      </div>
      <div className="rowActions">
        <label className="banUntil">
          <span>{t("banUntil")}</span>
          <input type="datetime-local" value={banUntil} onChange={(event) => setBanUntil(event.target.value)} />
        </label>
        <button className="secondary" onClick={applyCustomBan} disabled={!banUntil}>
          <Ban size={16} /> {t("set")}
        </button>
        <button className="secondary" onClick={() => patch({ ban_expires_at: Math.floor(Date.now() / 1000) + 3600 })}>
          <Ban size={16} /> 1h
        </button>
        <button className="secondary" onClick={() => patch({ ban_expires_at: Math.floor(Date.now() / 1000) + 86400 })}>
          <Ban size={16} /> 24h
        </button>
        <button className="secondary" onClick={() => patch({ ban_expires_at: null })}>
          <Check size={16} /> {t("unban")}
        </button>
        <button className="secondary" onClick={kick}>
          <LogOut size={16} /> {t("kick")}
        </button>
      </div>
    </div>
  );
}

function OAuthSetupGuide({ channels }: { channels: OAuthChannelConfig[] }) {
  const configured = channels.length > 0 ? channels : [{ provider: "github", enabled: false, client_id: "" }];
  return (
    <details className="oauthGuide">
      <summary>
        <Shield size={17} />
        {t("oauthGuide")}
      </summary>
      <div className="guideBody">
        <section>
          <h4>{t("commonFlow")}</h4>
          <ol>
            <li>在对应平台创建 OAuth App / Application。</li>
            <li>应用类型选择 Web application / Confidential client；不要选纯前端 SPA。</li>
            <li>把下面的 Callback / Redirect URI 完整复制到平台配置里。</li>
            <li>复制 Client ID 和 Client Secret 到本面板；Secret 会用密码框展示，生产环境仍建议由后端加密保存或环境变量托管。</li>
            <li>保存后先保持 Disabled，确认后端已经支持该 provider 并配置 secret，再启用。</li>
            <li>重启后端或重新加载配置，然后用无痕窗口测试登录。</li>
          </ol>
        </section>

        <section>
          <h4>{t("currentCallbacks")}</h4>
          <div className="callbackList">
            {configured.map((channel) => (
              <label key={channel.provider}>
                <span>{oauthProviderLabel(channel.provider)}</span>
                <input value={oauthCallbackUrl(channel.provider)} readOnly onFocus={(event) => event.currentTarget.select()} />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h4>{t("presetDocs")}</h4>
          <div className="docLinks">
            {oauthPresets.map((preset) => (
              <a key={preset.provider} href={preset.docsUrl} target="_blank" rel="noreferrer">
                {preset.label} OAuth docs
              </a>
            ))}
          </div>
        </section>

        <section>
          <h4>{t("providerNotes")}</h4>
          <ul>
            <li>
              <strong>GitHub：</strong>Homepage URL 填站点根地址，Authorization callback URL 填
              <code>{oauthCallbackUrl("github")}</code>。
            </li>
            <li>
              <strong>Google：</strong>Authorized redirect URIs 必须逐条添加完整回调 URL；测试阶段记得把测试用户加入 OAuth consent screen。
            </li>
            <li>
              <strong>Microsoft：</strong>Redirect URI 选择 Web；多租户/单租户要和你的用户范围一致。
            </li>
            <li>
              <strong>GitLab：</strong>Redirect URI 填完整回调 URL，scope 通常至少需要读取用户身份/邮箱。
            </li>
          </ul>
        </section>

        <section className="guideWarning">
          <h4>{t("importantNotes")}</h4>
          <ul>
            <li>Client Secret 是敏感信息：不要截图外泄；生产环境建议后端加密保存，或使用服务器环境变量/密钥管理器。</li>
            <li>登录入口会跳转到 <code>/api/auth/oauth/&lt;provider&gt;/start</code>，回调为 <code>/api/auth/oauth/&lt;provider&gt;/callback</code>。</li>
            <li>新增非 GitHub 渠道前，后端也必须实现对应 provider 的 start/callback 和 token/userinfo 交换。</li>
            <li>如果站点挂在 <code>/mcp</code> 子路径下，回调 URL 也必须包含 <code>/mcp</code>。</li>
            <li>生产环境必须使用 HTTPS；HTTP 回调通常只适合 localhost 开发。</li>
          </ul>
        </section>
      </div>
    </details>
  );
}

function AccountView({
  token,
  user,
  preferences,
  setPreferences,
  onRefresh,
  refreshing,
  notice
}: {
  token: string;
  user: User;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
  onRefresh: () => void;
  refreshing: boolean;
  notice?: string;
}) {
  return (
    <section className="page">
      <div className="pageTitle">
        <div>
          <h2>{t("settings")}</h2>
          <p>{t("settingsSubtitle")}</p>
        </div>
        <button className="secondary" onClick={onRefresh} disabled={refreshing}>
          <RefreshCw size={17} className={refreshing ? "spin" : ""} /> {t("updatePanel")}
        </button>
      </div>
      {notice && <div className="notice">{notice}</div>}
      <PersonalizationPanel user={user} preferences={preferences} setPreferences={setPreferences} />
      <ProfilePanel token={token} />
    </section>
  );
}

function PersonalizationPanel({
  user,
  preferences,
  setPreferences
}: {
  user: User;
  preferences: Preferences;
  setPreferences: (preferences: Preferences) => void;
}) {
  const update = (patch: Partial<Preferences>) => setPreferences({ ...preferences, ...patch });
  const reset = () => setPreferences(defaultPreferences);
  const displayName = preferences.displayName.trim() || user.email;
  return (
    <section className="panel personalizationPanel">
      <div className="panelHead">
        <div className="panelTitle">
          <div className="avatarCircle large" style={{ background: preferences.avatarColor }}>
            {avatarText(user, preferences)}
          </div>
          <div>
            <h3>{t("personalization")}</h3>
            <p>{displayName} · {user.email} · {user.provider}</p>
          </div>
        </div>
        <button className="secondary small" onClick={reset}>
          <RefreshCw size={15} /> {t("reset")}
        </button>
      </div>

      <div className="settingsGrid">
        <label>
          <span>{t("displayName")}</span>
          <input
            value={preferences.displayName}
            onChange={(event) => update({ displayName: event.target.value })}
            placeholder={user.email}
          />
        </label>
        <label>
          <span>{t("avatarText")}</span>
          <input
            value={preferences.avatarText}
            maxLength={4}
            onChange={(event) => update({ avatarText: event.target.value })}
            placeholder={initials(user.email)}
          />
        </label>
        <label>
          <span>{t("avatarColor")}</span>
          <input
            type="color"
            value={preferences.avatarColor}
            onChange={(event) => update({ avatarColor: event.target.value })}
          />
        </label>
      </div>

      <div className="quickSettings">
        <div className="segmented">
          <button className={preferences.theme === "light" ? "active" : ""} onClick={() => update({ theme: "light" })}>
            <Sun size={16} /> {t("light")}
          </button>
          <button className={preferences.theme === "dark" ? "active" : ""} onClick={() => update({ theme: "dark" })}>
            <Moon size={16} /> {t("dark")}
          </button>
        </div>

        <div className="segmented">
          <button className={preferences.language === "zh" ? "active" : ""} onClick={() => update({ language: "zh" })}>
            <Languages size={16} /> 中文
          </button>
          <button className={preferences.language === "en" ? "active" : ""} onClick={() => update({ language: "en" })}>
            <Languages size={16} /> English
          </button>
        </div>

        <label className="toggleRow compactToggle">
          <span>{t("compact")}</span>
          <input
            type="checkbox"
            checked={preferences.compact}
            onChange={(event) => update({ compact: event.target.checked })}
          />
        </label>
      </div>
    </section>
  );
}

function ProfilePanel({ token }: { token: string }) {
  const [profile, setProfile] = useState(profileTemplate);
  const [tags, setTags] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch(apiPath("/api/me/profile"), { headers: authHeaders(token) })
      .then((response) => safeJson<UserProfile>(response))
      .then((data) => {
        if (!data) return;
        setProfile(data.profile || profileTemplate);
        setTags(data.tags.join(" "));
      })
      .catch(() => {});
  }, [token]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setStatus(t("savingProfile"));
    const response = await fetch(apiPath("/api/me/profile"), {
      method: "POST",
      headers: { ...authHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ profile, tags: splitTags(tags) })
    });
    if (!response.ok) {
      setStatus((await safeError(response)) || t("saveProfileFailed"));
      return;
    }
    const data = await safeJson<UserProfile>(response);
    if (data) {
      setProfile(data.profile || profileTemplate);
      setTags(data.tags.join(" "));
    }
    setStatus(t("profileSaved"));
  }

  return (
    <section className="panel">
      <div className="panelHead">
        <div className="panelTitle">
          <UserCircle size={18} />
          <div>
            <h3>{t("publicProfile")}</h3>
            <p>{t("profileHelp")}</p>
          </div>
        </div>
      </div>
      <form className="profileForm" onSubmit={save}>
        <label>
          <span>{t("profile")}</span>
          <textarea value={profile} onChange={(event) => setProfile(event.target.value)} placeholder={profileTemplate} />
        </label>
        <label>
          <span>标签</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="#review #ops #qa" />
        </label>
        <div className="rowActions">
          <button className="secondary" type="button" onClick={() => setProfile(profileTemplate)}>
            {t("useTemplate")}
          </button>
          <button className="primary" type="submit">
            <Check size={17} /> {t("saveProfile")}
          </button>
        </div>
      </form>
      {status && <div className={status.endsWith(".") ? "notice" : "notice warning"}>{status}</div>}
    </section>
  );
}

function UserCard({ profile }: { profile: UserProfile }) {
  const banned = profile.ban_expires_at && profile.ban_expires_at > Math.floor(Date.now() / 1000);
  return (
    <article className="userCard">
      <div className="avatarCircle">{initials(profile.email)}</div>
      <div>
        <strong>{profile.email}</strong>
        <p>{profile.profile || t("profileMissing")}</p>
        <div className="metaRow">
          <span className={profile.online ? "status onlineStatus" : "status"}>{profile.online ? t("onlineStatus") : t("offlineStatus")}</span>
          <span>{profile.provider}</span>
          {banned && <span className="dangerText">banned until {formatTime(profile.ban_expires_at!)}</span>}
        </div>
        <div className="tagRow">{profile.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
      </div>
    </article>
  );
}

function Blank({ text = "Waiting for agent requests" }: { text?: string }) {
  return (
    <div className="blank">
      <MessageSquareText size={32} />
      <span>{text}</span>
    </div>
  );
}

function TaskIcon({ kind }: { kind: TaskKind }) {
  if (kind === "steps") return <ListChecks size={18} />;
  return <MessageSquareText size={18} />;
}

function Countdown({ request, now }: { request: HumanRequest; now: number }) {
  const remaining = Math.max(0, request.expires_at - now);
  if (remaining === 0) return <span className="countdown expired">expired</span>;
  return <span className={remaining <= 30 ? "countdown urgent" : "countdown"}>{formatDuration(remaining)}</span>;
}

function useNow() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(handle);
  }, []);
  return now;
}

function usePreferences(): [Preferences, (preferences: Preferences) => void] {
  const [preferences, setPreferencesState] = useState<Preferences>(() => {
    try {
      const raw = localStorage.getItem(preferencesKey);
      if (!raw) return defaultPreferences;
      return { ...defaultPreferences, ...JSON.parse(raw) };
    } catch {
      return defaultPreferences;
    }
  });

  function setPreferences(next: Preferences) {
    setPreferencesState(next);
    localStorage.setItem(preferencesKey, JSON.stringify(next));
  }

  return [preferences, setPreferences];
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}

async function refreshRequests(token: string, setRequests: (requests: HumanRequest[]) => void) {
  const response = await fetch(apiPath("/api/requests"), { headers: authHeaders(token) });
  const data = await safeJson<HumanRequest[]>(response);
  if (data) setRequests(sortRequests(data));
}

async function refreshTrash(token: string, setTrash: (trash: ExpiredRequest[]) => void) {
  const response = await fetch(apiPath("/api/trash"), { headers: authHeaders(token) });
  const data = await safeJson<ExpiredRequest[]>(response);
  setTrash(data ? sortTrash(data) : []);
}

async function refreshUsers(token: string, setOnline: (users: UserProfile[]) => void, setDirectory: (users: UserProfile[]) => void, setTags: (tags: TagStat[]) => void) {
  const [online, users, tags] = await Promise.all([
    fetch(apiPath("/api/users/online"), { headers: authHeaders(token) }),
    fetch(apiPath("/api/users/search"), { headers: authHeaders(token) }),
    fetch(apiPath("/api/tags"), { headers: authHeaders(token) })
  ]);
  const onlineData = await safeJson<UserProfile[]>(online);
  const usersData = await safeJson<UserProfile[]>(users);
  const tagsData = await safeJson<{ tags?: TagStat[] }>(tags);
  setOnline(onlineData ?? []);
  setDirectory(usersData ?? []);
  setTags(tagsData?.tags ?? []);
}

async function refreshDirectory(token: string, setDirectory: (users: UserProfile[]) => void, query: string) {
  const params = query.trim().startsWith("#") ? `?tag=${encodeURIComponent(query.trim())}` : `?q=${encodeURIComponent(query.trim())}`;
  const response = await fetch(apiPath(`/api/users/search${query.trim() ? params : ""}`), { headers: authHeaders(token) });
  setDirectory((await safeJson<UserProfile[]>(response)) ?? []);
}

async function refreshAdmin(token: string, setIsAdmin: (isAdmin: boolean) => void, setUsers: (users: UserProfile[]) => void, setSettings: (settings: AdminSettings) => void) {
  const [users, settings] = await Promise.all([
    fetch(apiPath("/api/admin/users"), { headers: authHeaders(token) }),
    fetch(apiPath("/api/admin/settings"), { headers: authHeaders(token) })
  ]);
  const usersData = await safeJson<UserProfile[]>(users);
  const settingsData = await safeJson<AdminSettings>(settings);
  if (usersData && settingsData) {
    setIsAdmin(true);
    setUsers(usersData);
    setSettings(settingsData);
  } else {
    setIsAdmin(false);
  }
}

async function safeJson<T>(response: Response): Promise<T | null> {
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function safeError(response: Response) {
  const data = await safeJson<{ error?: string }>(response.clone());
  return data?.error ?? `${response.status} ${response.statusText}`;
}

function upsertRequest(current: HumanRequest[], next: HumanRequest) {
  const without = current.filter((request) => request.id !== next.id);
  return sortRequests([...without, next]);
}

function sortRequests(requests: HumanRequest[]) {
  return [...requests].sort((a, b) => a.expires_at - b.expires_at);
}

function sortTrash(trash: ExpiredRequest[]) {
  return [...trash].sort((a, b) => b.expired_at - a.expired_at);
}

function splitTags(value: string) {
  return value.split(/\s+/).filter(Boolean);
}

function initials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function avatarText(user: User, preferences: Preferences) {
  return (preferences.avatarText.trim() || initials(user.email)).slice(0, 4).toUpperCase();
}

function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

function randomSecret() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function defaultMcpUrl() {
  const path = base.endsWith("/mcp") ? base : `${base}/mcp`;
  return new URL(path || "/mcp", window.location.href).toString();
}

function normalizeMcpUrl(value: string) {
  const url = new URL(value, window.location.href);
  url.pathname = url.pathname.replace(/\/mcp\/mcp$/, "/mcp");
  return url.toString();
}

function agentInstallPrompt(mcpUrl: string, accessKey: string) {
  const headerJson = accessKey
    ? `,
      "headers": {
        "x-humen-agent-secret": "${accessKey}"
      }`
    : "";
  const secretLine = accessKey
    ? "需要带请求头：" + "x-humen-agent-secret" + ": " + accessKey
    : "当前不需要 Agent Secret。";
  return `请帮我把 humen-mcp 配置成一个 remote/http MCP server。

请先判断你当前使用的是哪种 Agent 工具或客户端，并使用它自带的 MCP 添加方式：

- 如果是 Codex CLI，请使用 Codex CLI 的 MCP 添加命令（不确定参数时先运行 codex mcp --help / codex mcp add --help）。
- 如果是 Claude Code / Claude CLI，请使用 Claude CLI 的 MCP 添加命令（不确定参数时先运行 claude mcp --help / claude mcp add --help）。
- 如果是其他编程 CLI 工具或 Agent 客户端，请使用该工具自带的 MCP 添加命令、设置页或导入功能。

如果当前是 CLI 工具，必须通过命令行添加 MCP server；不要直接编辑配置文件（例如 settings.json、config.toml、claude_desktop_config.json 等）来添加。

名称：humen
MCP URL：${mcpUrl}
${secretLine}

如果客户端只能通过 mcpServers JSON 导入或设置页添加，请使用下面内容；不要因为这个示例去手动编辑配置文件：

{
  "mcpServers": {
    "humen": {
      "url": "${mcpUrl}"${headerJson}
    }
  }
}

配置后请重启/刷新 MCP 连接，并执行 tools/list 验证能看到 ask_humen、list_online_humens、search_humen_profiles、list_humen_tags。`;
}

async function copyToClipboard(text: string, setStatus: (status: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(t("copied"));
  } catch {
    setStatus(t("copyFailed"));
  }
}

function normalizeOAuthProvider(provider: string) {
  return provider
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function oauthProviderLabel(provider: string) {
  const normalized = normalizeOAuthProvider(provider);
  const preset = oauthPresets.find((item) => item.provider === normalized);
  if (preset) return preset.label;
  return normalized || provider;
}

function oauthStartUrl(provider: string) {
  return apiPath(`/api/auth/oauth/${normalizeOAuthProvider(provider)}/start`);
}

function clawbotIncomingUrl(id: string, secret: string) {
  const url = new URL(apiPath(`/api/integrations/wechat/clawbot/${id}`), window.location.href);
  if (secret.trim()) url.searchParams.set("secret", secret.trim());
  return url.toString();
}

function oauthCallbackUrl(provider: string) {
  return new URL(apiPath(`/api/auth/oauth/${normalizeOAuthProvider(provider)}/callback`), window.location.href).toString();
}

function mergeOAuthSecrets(saved: AdminSettings, draft: AdminSettings): AdminSettings {
  const draftSecrets = new Map(
    draft.oauth_channels.map((channel) => [channel.provider, channel.client_secret ?? ""])
  );
  return {
    ...saved,
    oauth_channels: saved.oauth_channels.map((channel) => ({
      ...channel,
      client_secret: channel.client_secret ?? draftSecrets.get(channel.provider) ?? ""
    }))
  };
}

function imageSource(request: HumanRequest) {
  if (request.image_url) return request.image_url;
  const image = request.image_base64?.trim();
  if (!image) return null;
  if (image.startsWith("data:image/")) return image;
  return `data:${request.image_mime_type || "image/png"};base64,${image}`;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

function formatTime(unix: number) {
  return new Date(unix * 1000).toLocaleString();
}

function logout(
  setToken: (token: string) => void,
  setUser: (user: User | null) => void,
  setRequests: (requests: HumanRequest[]) => void,
  setTrash: (trash: ExpiredRequest[]) => void
) {
  localStorage.removeItem(tokenKey);
  setToken("");
  setUser(null);
  setRequests([]);
  setTrash([]);
}

createRoot(document.getElementById("root")!).render(<App />);

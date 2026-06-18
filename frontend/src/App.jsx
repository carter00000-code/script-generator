import { useState } from "react";

// ── Constants ────────────────────────────────────────────
const SHOW_TYPES = [
  { id: "podcast", label: "Podcast",  icon: "ti-microphone",    desc: "輕鬆對談風格" },
  { id: "youtube", label: "YouTube",  icon: "ti-brand-youtube", desc: "開場吸睛節奏" },
  { id: "news",    label: "新聞播報", icon: "ti-news",          desc: "客觀正式語氣" },
  { id: "edu",     label: "教育節目", icon: "ti-school",        desc: "深入淺出說明" },
];
const TONES = ["輕鬆幽默", "正式嚴肅", "熱情活潑", "沉穩知性"];
const TIME_FILTERS = [
  { id: "today", label: "今天",   hours: 24  },
  { id: "24h",   label: "24小時", hours: 24  },
  { id: "72h",   label: "72小時", hours: 72  },
  { id: "week",  label: "一週",   hours: 168 },
  { id: "month", label: "一個月", hours: 720 },
];
const AUDIENCES  = ["一般大眾","學生","上班族","專業人士","決策者／主管","家長","創業者","銀髮族"];
const TAKEAWAYS  = ["知識與觀念","實用技巧","趨勢洞察","事件背景","多元觀點","行動建議","數據佐證","案例參考"];
const EMOTIONS   = ["好奇","擔憂","振奮","共鳴","緊迫感","反思","信任感","娛樂放鬆"];
const SOURCE_WEIGHTS = {
  "reuters.com":10,"bbc.com":10,"apnews.com":10,"bloomberg.com":9,
  "wsj.com":9,"nytimes.com":9,"theguardian.com":8,"ft.com":9,
  "cna.com.tw":9,"udn.com":8,"ltn.com.tw":7,"chinatimes.com":7,
  "ithome.com.tw":8,"technews.tw":7,"inside.com.tw":7,
  "techcrunch.com":8,"theverge.com":8,"wired.com":8,"wikipedia.org":5,
};

// ── Backend base URL ──────────────────────────────────────
// In dev, Vite proxies /api → http://localhost:3001 (see vite.config.js).
// In production, set VITE_API_URL to the Railway backend URL.
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

// ── Helpers ───────────────────────────────────────────────
function getSourceWeight(url) {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    for (const [d, w] of Object.entries(SOURCE_WEIGHTS)) if (h.includes(d)) return w;
    return 5;
  } catch { return 4; }
}
function getSourceName(url) {
  try {
    const p = new URL(url).hostname.replace("www.", "").split(".");
    return p[p.length - 2]?.toUpperCase() || url;
  } catch { return url; }
}
function hoursAgo(ds) {
  if (!ds) return 9999;
  try { return (Date.now() - new Date(ds).getTime()) / 3600000; } catch { return 9999; }
}
function freshnessScore(h) {
  if (h < 6)   return 10;
  if (h < 24)  return 8;
  if (h < 48)  return 6;
  if (h < 72)  return 4;
  if (h < 168) return 2;
  return 1;
}
function hotScore(item) {
  return getSourceWeight(item.url || "") * 0.55 + freshnessScore(hoursAgo(item.date)) * 0.45;
}
function timeBadge(h) {
  if (h < 6)  return { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5", label: "剛剛" };
  if (h < 24) return { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC", label: "今日" };
  if (h < 72) return { bg: "#FAEEDA", text: "#633806", border: "#EF9F27", label: "近期" };
  return { bg: "#F1EFE8", text: "#444441", border: "#B4B2A9", label: "較早" };
}

// ── UI Atoms ─────────────────────────────────────────────
function SpeakerTag({ name, color }) {
  const c = ({
    host:   { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" },
    guest:  { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" },
    guest2: { bg: "#FAECE7", text: "#712B13", border: "#F0997B" },
    guest3: { bg: "#FBEAF0", text: "#72243E", border: "#ED93B1" },
  })[color] || { bg: "#E1F5EE", text: "#085041", border: "#5DCAA5" };
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 500,
      padding: "2px 8px", borderRadius: 20,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      marginRight: 8, whiteSpace: "nowrap",
    }}>{name}</span>
  );
}

function PillGroup({ options, selected, onToggle, multi = true }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map(o => {
        const active = multi ? selected.includes(o) : selected === o;
        return (
          <button key={o} onClick={() => onToggle(o)} style={{
            padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
            border: active ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
            background: active ? "var(--color-background-info)" : "transparent",
            color: active ? "var(--color-text-info)" : "var(--color-text-secondary)",
            fontWeight: active ? 500 : 400,
          }}>{o}</button>
        );
      })}
    </div>
  );
}

function Label({ children }) {
  return <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>{children}</label>;
}

// ── Main Component ────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("plan"); // plan | select | script

  // Plan state
  const [topic, setTopic]               = useState("");
  const [episodeTitle, setEpisodeTitle] = useState("");
  const [timeFilter, setTimeFilter]     = useState("24h");
  const [showType, setShowType]         = useState("podcast");
  const [tone, setTone]                 = useState("輕鬆幽默");
  const [duration, setDuration]         = useState(10);
  const [hostName, setHostName]         = useState("主持人");
  const [hasGuests, setHasGuests]       = useState(false);
  const [guests, setGuests]             = useState([{ id: 1, name: "", bio: "", viewpoint: "" }]);
  const [audiences, setAudiences]       = useState([]);
  const [takeaways, setTakeaways]       = useState([]);
  const [emotions, setEmotions]         = useState([]);
  const [extraMaterial, setExtraMaterial] = useState("");

  // Search state
  const [isSearching, setIsSearching]   = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError]   = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [sortBy, setSortBy]             = useState("hot");

  // Script state
  const [isGenerating, setIsGenerating] = useState(false);
  const [script, setScript]             = useState(null);
  const [copied, setCopied]             = useState(false);

  const guestColors = ["guest", "guest2", "guest3"];

  const toggleMulti = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  const addGuest = () => {
    if (guests.length >= 3) return;
    setGuests([...guests, { id: Date.now(), name: "", bio: "", viewpoint: "" }]);
  };
  const removeGuest = id => setGuests(guests.filter(g => g.id !== id));
  const updateGuest = (id, field, val) =>
    setGuests(guests.map(g => g.id === id ? { ...g, [field]: val } : g));

  // ── API helper — calls our Express backend, not Anthropic directly ──
  const callAPI = async (messages, useSearch = false) => {
    const body = { model: "claude-sonnet-4-6", max_tokens: 3000, messages };
    if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];

    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(`API ${res.status}: ${e?.error?.message || res.statusText}`);
    }
    return res.json();
  };

  // ── Search ──
  const doSearch = async () => {
    if (!topic.trim()) return;
    setIsSearching(true);
    setSearchResults([]);
    setSelectedIds(new Set());
    setSearchError(null);
    const tf = TIME_FILTERS.find(t => t.id === timeFilter);

    const audienceHint = audiences.length ? `目標受眾：${audiences.join("、")}。` : "";
    const takeawayHint = takeaways.length ? `希望帶走：${takeaways.join("、")}。` : "";
    const guestHint    = hasGuests && guests[0]?.name
      ? `來賓背景：${guests.map(g => g.name + (g.bio ? `（${g.bio}）` : "")).join("、")}。`
      : "";

    try {
      const query = `${topic} ${audienceHint} ${takeawayHint} ${guestHint}`.trim();

      // Step 1 — Tavily 真實搜尋
      const searchRes = await fetch(`${API_BASE}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!searchRes.ok) throw new Error("搜尋失敗，請稍後再試");
      const searchData = await searchRes.json();
      const results = searchData.results || [];
      if (results.length === 0) throw new Error("找不到相關新聞，請換個關鍵字");

      // Step 2 — Claude 整理成結構化資料
      const rawText = results.map(r => `標題：${r.title}\n摘要：${r.content}\n網址：${r.url}\n日期：${r.published_date || ""}`).join("\n\n");
      const structPrompt = `以下是搜尋結果，請整理為純 JSON 陣列，不要任何說明或 markdown：\n\n${rawText}\n\n格式：[{"title":"標題","summary":"一兩句摘要","url":"網址","date":"ISO日期或null","source":"媒體名稱"}]`;
      const data = await callAPI([{ role: "user", content: structPrompt }]);
      const jsonText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      const clean = jsonText.replace(/```json|```/g, "").trim();

      let items = [];
      try { items = JSON.parse(clean); }
      catch { const m = clean.match(/\[[\s\S]*\]/); if (m) try { items = JSON.parse(m[0]); } catch {} }
      if (items.length === 0) throw new Error("無法解析搜尋結果，請換個關鍵字試試");

      setSearchResults(items);
      setStep("select");
    } catch (e) {
      setSearchError(e.message || "搜尋失敗，請稍後再試");
      setStep("select");
    }
    setIsSearching(false);
  };

  // ── Generate script ──
  const sorted = [...searchResults].sort((a, b) =>
    sortBy === "hot" ? hotScore(b) - hotScore(a) : hoursAgo(a.date) - hoursAgo(b.date)
  );

  const buildScriptPrompt = () => {
    const sel = sorted.filter((_, i) => selectedIds.has(i));
    const showLabel = SHOW_TYPES.find(s => s.id === showType)?.label || showType;

    const srcBlock = sel.length
      ? "\n\n【參考新聞素材】\n" + sel.map((s, i) =>
          `${i + 1}. 【${s.source || getSourceName(s.url)}】${s.title}\n   摘要：${s.summary}`
        ).join("\n")
      : "";

    const extraBlock = extraMaterial.trim()
      ? `\n\n【手動補充素材】\n${extraMaterial.trim()}`
      : "";

    const guestBlock = hasGuests && guests.some(g => g.name)
      ? "\n\n【來賓資訊】\n" + guests.filter(g => g.name).map(g =>
          `・${g.name}${g.bio ? `，${g.bio}` : ""}\n  核心觀點：${g.viewpoint || "未填寫"}`
        ).join("\n")
      : "";

    const audienceBlock = audiences.length ? `\n目標受眾：${audiences.join("、")}` : "";
    const takeawayBlock = takeaways.length ? `\n希望帶走：${takeaways.join("、")}` : "";
    const emotionBlock  = emotions.length  ? `\n主打情緒：${emotions.join("、")}`  : "";

    const speakerInfo = hasGuests && guests.some(g => g.name)
      ? `這是多人對談節目，說話者：主持人「${hostName}」${guests.filter(g => g.name).map(g => `、來賓「${g.name}」`).join("")}。每段對白前標示【說話者名稱】。`
      : `單人旁白節目，主持人「${hostName}」。`;

    return `你是專業繁體中文節目腳本撰寫師。

主題：${topic}${episodeTitle ? `\n集數標題：${episodeTitle}` : ""}
節目類型：${showLabel}　語氣：${tone}　長度：約${duration}分鐘
${speakerInfo}${audienceBlock}${takeawayBlock}${emotionBlock}
${guestBlock}${srcBlock}${extraBlock}

腳本結構：
1.【開場白】吸引注意，點出今集主題（約30秒）
2.【主題介紹】說明核心議題與討論方向
3.【主體內容】分2-3段深入探討，每段有小標題，融合來源素材呈現多角度觀點
4.【重點總結】整理本集核心觀念
5.【結尾呼籲】對應目標受眾的行動呼籲

直接輸出腳本，口語化，適合錄音。`;
  };

  const generateScript = async () => {
    setIsGenerating(true);
    setScript(null);
    try {
      const data = await callAPI([{ role: "user", content: buildScriptPrompt() }]);
      setScript((data.content || []).filter(b => b.type === "text").map(b => b.text).join("") || "");
      setStep("script");
    } catch {
      setScript("發生錯誤，請稍後再試。");
      setStep("script");
    }
    setIsGenerating(false);
  };

  const renderScript = text => {
    if (!hasGuests) return (
      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 14, color: "var(--color-text-primary)" }}>{text}</p>
    );
    const names = [hostName, ...guests.filter(g => g.name).map(g => g.name)];
    return text.split("\n").map((line, i) => {
      let matched = null, ck = null;
      for (let j = 0; j < names.length; j++) {
        if (line.startsWith(`【${names[j]}】`) || line.startsWith(`${names[j]}：`)) {
          matched = names[j]; ck = j === 0 ? "host" : guestColors[j - 1]; break;
        }
      }
      if (matched) {
        const rest = line.replace(new RegExp(`^[【]?${matched}[】：]?\\s*`), "");
        return (
          <div key={i} style={{ marginBottom: 12 }}>
            <SpeakerTag name={matched} color={ck} />
            <span style={{ fontSize: 14, lineHeight: 1.9 }}>{rest}</span>
          </div>
        );
      }
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />;
      return <p key={i} style={{ margin: "4px 0", fontSize: 14, color: "var(--color-text-secondary)", lineHeight: 1.7 }}>{line}</p>;
    });
  };

  const STEPS = [["plan", "節目企劃"], ["select", "選取素材"], ["script", "生成腳本"]];

  return (
    <div style={{ padding: "1.5rem 0", maxWidth: 680 }}>

      {/* Step bar */}
      <div style={{ display: "flex", marginBottom: "1.75rem", borderRadius: "var(--border-radius-md)", overflow: "hidden", border: "0.5px solid var(--color-border-tertiary)" }}>
        {STEPS.map(([s, label], idx) => {
          const active = step === s;
          const done = (s === "plan" && ["select", "script"].includes(step)) || (s === "select" && step === "script");
          return (
            <div key={s} onClick={() => done && setStep(s)} style={{
              flex: 1, padding: "8px 4px", textAlign: "center", fontSize: 12, fontWeight: 500,
              background: active ? "var(--color-background-info)" : done ? "var(--color-background-secondary)" : "transparent",
              color: active ? "var(--color-text-info)" : "var(--color-text-secondary)",
              borderLeft: idx > 0 ? "0.5px solid var(--color-border-tertiary)" : "none",
              cursor: done ? "pointer" : "default",
            }}>
              {done ? <i className="ti ti-check" aria-hidden="true" style={{ marginRight: 4 }} /> : `${idx + 1}. `}{label}
            </div>
          );
        })}
      </div>

      {/* ══ STEP 1 — 節目企劃 ══ */}
      {step === "plan" && (
        <div>
          {/* 主題資訊 */}
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>主題資訊</p>

            <div style={{ marginBottom: 12 }}>
              <Label>搜尋關鍵字 / 節目主題 <span style={{ color: "var(--color-text-danger)" }}>*</span></Label>
              <input value={topic} onChange={e => setTopic(e.target.value)}
                placeholder="例：台灣 AI 新創、氣候變遷政策、半導體供應鏈…"
                style={{ width: "100%", boxSizing: "border-box" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <Label>這集標題（選填）</Label>
              <input value={episodeTitle} onChange={e => setEpisodeTitle(e.target.value)}
                placeholder="例：外資喊的個股目標價到底能不能信？"
                style={{ width: "100%", boxSizing: "border-box" }} />
            </div>

            <div>
              <Label>時間範圍</Label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TIME_FILTERS.map(tf => (
                  <button key={tf.id} onClick={() => setTimeFilter(tf.id)} style={{
                    padding: "5px 14px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                    border: timeFilter === tf.id ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                    background: timeFilter === tf.id ? "var(--color-background-info)" : "transparent",
                    color: timeFilter === tf.id ? "var(--color-text-info)" : "var(--color-text-secondary)",
                    fontWeight: timeFilter === tf.id ? 500 : 400,
                  }}>{tf.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* 節目設定 */}
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>節目設定</p>

            <div style={{ marginBottom: 14 }}>
              <Label>節目類型</Label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
                {SHOW_TYPES.map(s => (
                  <button key={s.id} onClick={() => setShowType(s.id)} style={{
                    textAlign: "left", padding: "8px 10px", borderRadius: "var(--border-radius-md)", cursor: "pointer",
                    border: showType === s.id ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                    background: showType === s.id ? "var(--color-background-info)" : "var(--color-background-primary)",
                  }}>
                    <i className={`ti ${s.icon}`} style={{ fontSize: 14, display: "block", marginBottom: 2, color: showType === s.id ? "var(--color-text-info)" : "var(--color-text-secondary)" }} aria-hidden="true" />
                    <span style={{ fontSize: 11, fontWeight: 500, color: showType === s.id ? "var(--color-text-info)" : "var(--color-text-primary)" }}>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <Label>語氣風格</Label>
                <select value={tone} onChange={e => setTone(e.target.value)} style={{ width: "100%" }}>
                  {TONES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <Label>節目長度：{duration} 分鐘</Label>
                <input type="range" min={3} max={30} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ width: "100%", marginTop: 6 }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--color-text-tertiary)" }}><span>3分</span><span>30分</span></div>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label>主打受眾（可複選）</Label>
              <PillGroup options={AUDIENCES} selected={audiences} onToggle={v => toggleMulti(audiences, setAudiences, v)} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Label>這集想讓觀眾帶走什麼？（可複選）</Label>
              <PillGroup options={TAKEAWAYS} selected={takeaways} onToggle={v => toggleMulti(takeaways, setTakeaways, v)} />
            </div>

            <div>
              <Label>主打的觀眾情緒（可複選）</Label>
              <PillGroup options={EMOTIONS} selected={emotions} onToggle={v => toggleMulti(emotions, setEmotions, v)} />
            </div>
          </div>

          {/* 來賓設定 */}
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasGuests ? 12 : 0 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>來賓設定</span>
                <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>主持人 + 最多 3 位來賓</span>
              </div>
              <button onClick={() => setHasGuests(!hasGuests)} style={{
                padding: "3px 12px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                border: "0.5px solid var(--color-border-secondary)",
                background: hasGuests ? "var(--color-background-success)" : "transparent",
                color: hasGuests ? "var(--color-text-success)" : "var(--color-text-secondary)", fontWeight: 500,
              }}>{hasGuests ? "已開啟" : "開啟"}</button>
            </div>

            {hasGuests && (
              <div>
                <div style={{ marginBottom: 10 }}>
                  <Label>主持人名稱</Label>
                  <input value={hostName} onChange={e => setHostName(e.target.value)}
                    placeholder="主持人名稱" style={{ width: "100%", boxSizing: "border-box" }} />
                </div>
                {guests.map((g, idx) => (
                  <div key={g.id} style={{ padding: "10px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <SpeakerTag name={`來賓 ${idx + 1}`} color={guestColors[idx]} />
                      {guests.length > 1 && (
                        <button onClick={() => removeGuest(g.id)} style={{ padding: "2px 8px", fontSize: 11, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>移除</button>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                      <div>
                        <Label>姓名</Label>
                        <input value={g.name} onChange={e => updateGuest(g.id, "name", e.target.value)} placeholder="來賓姓名" style={{ width: "100%", boxSizing: "border-box" }} />
                      </div>
                      <div>
                        <Label>背景 / 身份</Label>
                        <input value={g.bio} onChange={e => updateGuest(g.id, "bio", e.target.value)} placeholder="例：CFA、前小摩分析師" style={{ width: "100%", boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div>
                      <Label>核心觀點或立場（選填）</Label>
                      <input value={g.viewpoint} onChange={e => updateGuest(g.id, "viewpoint", e.target.value)} placeholder="例：認為外資報告是觀點產品，目標價僅供參考" style={{ width: "100%", boxSizing: "border-box" }} />
                    </div>
                  </div>
                ))}
                {guests.length < 3 && (
                  <button onClick={addGuest} style={{ fontSize: 12, padding: "6px 12px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                    <i className="ti ti-plus" aria-hidden="true" style={{ marginRight: 4 }} />新增來賓
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 補充素材 */}
          <div style={{ padding: "1rem 1.25rem", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>手動補充素材（選填）</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-secondary)" }}>貼入你找到的數據、新聞摘要、案例，AI 會一起融入腳本</p>
            <textarea value={extraMaterial} onChange={e => setExtraMaterial(e.target.value)}
              placeholder={"從案例資料庫挑選，或直接貼入你找到的數據、新聞、案例…\n\n例：根據主計總處2024Q4報告，台灣GDP成長率達3.1%…"}
              style={{ width: "100%", boxSizing: "border-box", minHeight: 80, resize: "vertical", fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, padding: "8px 10px", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          </div>

          <button onClick={doSearch} disabled={!topic.trim() || isSearching} style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 500,
            borderRadius: "var(--border-radius-md)",
            cursor: topic.trim() && !isSearching ? "pointer" : "not-allowed",
            border: "0.5px solid var(--color-border-secondary)",
            background: topic.trim() && !isSearching ? "var(--color-background-secondary)" : "var(--color-background-tertiary)",
            color: topic.trim() && !isSearching ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          }}>
            {isSearching
              ? <><i className="ti ti-loader" aria-hidden="true" style={{ marginRight: 6 }} />搜尋中，請稍候…</>
              : <><i className="ti ti-search" aria-hidden="true" style={{ marginRight: 6 }} />搜尋新聞素材</>}
          </button>
        </div>
      )}

      {/* ══ STEP 2 — 選取素材 ══ */}
      {step === "select" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>找到 {searchResults.length} 則新聞</span>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>已選 {selectedIds.size} 則</span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>排序：</span>
              {[["hot", "熱度", "ti-flame"], ["time", "時間", "ti-clock"]].map(([s, label, icon]) => (
                <button key={s} onClick={() => setSortBy(s)} style={{
                  padding: "4px 10px", fontSize: 12, borderRadius: 20, cursor: "pointer",
                  border: sortBy === s ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                  background: sortBy === s ? "var(--color-background-info)" : "transparent",
                  color: sortBy === s ? "var(--color-text-info)" : "var(--color-text-secondary)", fontWeight: sortBy === s ? 500 : 400,
                }}><i className={`ti ${icon}`} aria-hidden="true" style={{ marginRight: 3 }} />{label}</button>
              ))}
              <button onClick={() => setSelectedIds(new Set(sorted.map((_, i) => i)))} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>全選</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 20, border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>清除</button>
            </div>
          </div>

          {searchError && (
            <div style={{ padding: "1rem", marginBottom: 12, borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-danger)", background: "var(--color-background-danger)", color: "var(--color-text-danger)", fontSize: 13 }}>
              <i className="ti ti-alert-circle" aria-hidden="true" style={{ marginRight: 6 }} />{searchError}
            </div>
          )}
          {!searchError && searchResults.length === 0 && (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14, border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)" }}>
              <i className="ti ti-search-off" aria-hidden="true" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
              找不到相關新聞，請回上一步換個關鍵字或擴大時間範圍
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: "1.25rem" }}>
            {sorted.map((item, idx) => {
              const hrs = hoursAgo(item.date), badge = timeBadge(hrs), score = hotScore(item), sel = selectedIds.has(idx);
              const src = item.source || getSourceName(item.url || "");
              const toggle = () => setSelectedIds(prev => {
                const n = new Set(prev);
                n.has(idx) ? n.delete(idx) : n.add(idx);
                return n;
              });
              return (
                <div key={idx} onClick={toggle} style={{
                  padding: "12px 14px", borderRadius: "var(--border-radius-lg)", cursor: "pointer",
                  border: sel ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)",
                  background: sel ? "var(--color-background-info)" : "var(--color-background-primary)",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 2,
                      border: sel ? "none" : "1.5px solid var(--color-border-secondary)",
                      background: sel ? "var(--color-text-info)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {sel && <i className="ti ti-check" style={{ fontSize: 12, color: "#fff" }} aria-hidden="true" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", minWidth: 20 }}>#{idx + 1}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: sel ? "var(--color-text-info)" : "var(--color-text-primary)", lineHeight: 1.4, flex: 1 }}>{item.title}</span>
                      </div>
                      {item.summary && <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{item.summary}</p>}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#E6F1FB", color: "#0C447C", border: "0.5px solid #85B7EB" }}>
                          <i className="ti ti-building-newspaper" aria-hidden="true" style={{ marginRight: 3 }} />{src}
                        </span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.text, border: `0.5px solid ${badge.border}` }}>
                          <i className="ti ti-clock" aria-hidden="true" style={{ marginRight: 3 }} />{badge.label}{hrs < 9990 ? `（${Math.round(hrs)}小時前）` : ""}
                        </span>
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: "#FAEEDA", color: "#633806", border: "0.5px solid #EF9F27" }}>
                          <i className="ti ti-flame" aria-hidden="true" style={{ marginRight: 3 }} />熱度 {score.toFixed(1)}
                        </span>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: "var(--color-text-info)", textDecoration: "none" }}>
                            <i className="ti ti-external-link" aria-hidden="true" style={{ marginRight: 2 }} />原文
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={generateScript} disabled={isGenerating} style={{
            width: "100%", padding: "12px", fontSize: 14, fontWeight: 500,
            borderRadius: "var(--border-radius-md)", cursor: !isGenerating ? "pointer" : "not-allowed",
            border: "0.5px solid var(--color-border-secondary)",
            background: !isGenerating ? "var(--color-background-secondary)" : "var(--color-background-tertiary)",
            color: !isGenerating ? "var(--color-text-primary)" : "var(--color-text-tertiary)",
          }}>
            {isGenerating
              ? <><i className="ti ti-loader" aria-hidden="true" style={{ marginRight: 6 }} />生成腳本中…</>
              : <><i className="ti ti-sparkles" aria-hidden="true" style={{ marginRight: 6 }} />以選取素材生成腳本（{selectedIds.size} 則）</>}
          </button>
          <button onClick={() => setStep("plan")} style={{ width: "100%", marginTop: 8, padding: "8px", fontSize: 13, borderRadius: "var(--border-radius-md)", cursor: "pointer", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)" }}>
            <i className="ti ti-arrow-left" aria-hidden="true" style={{ marginRight: 4 }} />回到節目企劃
          </button>
        </div>
      )}

      {/* ══ STEP 3 — 生成腳本 ══ */}
      {step === "script" && (
        <div>
          {isGenerating
            ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-text-secondary)", fontSize: 14 }}>
                <i className="ti ti-loader" aria-hidden="true" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                正在撰寫腳本…
              </div>
            )
            : script && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>
                    <i className="ti ti-file-text" aria-hidden="true" style={{ marginRight: 6 }} />生成結果
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => { navigator.clipboard.writeText(script).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: copied ? "var(--color-text-success)" : "var(--color-text-secondary)", cursor: "pointer" }}>
                      <i className={`ti ${copied ? "ti-check" : "ti-copy"}`} aria-hidden="true" style={{ marginRight: 4 }} />{copied ? "已複製" : "複製"}
                    </button>
                    <button onClick={() => {
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(new Blob([script], { type: "text/plain;charset=utf-8" }));
                      a.download = `腳本_${(episodeTitle || topic).slice(0, 20)}.txt`;
                      a.click();
                    }} style={{ fontSize: 12, padding: "5px 12px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer" }}>
                      <i className="ti ti-download" aria-hidden="true" style={{ marginRight: 4 }} />下載 .txt
                    </button>
                  </div>
                </div>
                <div style={{ padding: "1.25rem", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-primary)", marginBottom: 10 }}>
                  {renderScript(script)}
                </div>
                <button onClick={() => setStep("select")} style={{ width: "100%", padding: "8px", fontSize: 13, borderRadius: "var(--border-radius-md)", cursor: "pointer", border: "0.5px solid var(--color-border-tertiary)", background: "transparent", color: "var(--color-text-secondary)" }}>
                  <i className="ti ti-arrow-left" aria-hidden="true" style={{ marginRight: 4 }} />回到素材選取
                </button>
              </>
            )
          }
        </div>
      )}
    </div>
  );
}

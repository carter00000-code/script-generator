# 部署指南

## 專案結構

```
Script Generator/
├── frontend/   → Vite + React，部署到 Vercel
└── backend/    → Node.js + Express，部署到 Railway
```

---

## 本地開發

### 1. 後端

```bash
cd backend
cp .env.example .env          # 填入你的 ANTHROPIC_API_KEY
npm install
npm run dev                   # 啟動於 http://localhost:3001
```

### 2. 前端

```bash
cd frontend
npm install
npm run dev                   # 啟動於 http://localhost:5173
```

> Vite 會自動把 `/api/*` 請求代理到 `localhost:3001`，不需要設定 CORS。

---

## 部署到 Railway（後端）

1. 在 Railway 新增專案 → **Deploy from GitHub repo**
2. 選 `backend/` 目錄（或整個 repo 並設 Root Directory 為 `backend`）
3. 在 Railway 的 **Variables** 加入：

   | 變數名稱          | 值                          |
   |-------------------|-----------------------------|
   | `ANTHROPIC_API_KEY` | `sk-ant-xxxx...`          |
   | `FRONTEND_ORIGIN`   | `https://你的vercel網址`   |

4. Railway 會自動偵測 `railway.toml` 並執行 `node server.js`。
5. 記錄 Railway 給你的網址，例如 `https://script-gen-backend.up.railway.app`。

---

## 部署到 Vercel（前端）

1. 在 Vercel 匯入 GitHub repo，**Root Directory** 設為 `frontend`
2. Framework Preset 選 **Vite**
3. 在 Vercel 的 **Environment Variables** 加入：

   | 變數名稱      | 值                                             |
   |---------------|------------------------------------------------|
   | `VITE_API_URL` | `https://script-gen-backend.up.railway.app`  |

4. 點 Deploy，完成。

---

## 環境變數總覽

### backend/.env
```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
FRONTEND_ORIGIN=https://your-app.vercel.app
```

### frontend（Vercel 設定）
```
VITE_API_URL=https://your-backend.up.railway.app
```

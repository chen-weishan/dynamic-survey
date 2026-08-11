# 前端視覺重構計畫（Liquid Glass）

> 決策日期：2026-08-11 14:30，透過 `/grill-with-docs` 釐清。
> 本檔只記錄**已決定的決策**與**已驗證的事實**，不放推測。

## 硬約束

| 約束 | 內容 |
|---|---|
| 期限 | 2026-08-12 上午 11:00 live demo（課堂／非正式，壞了不致命） |
| 可用工時 | 2026-08-11 14:30–23:00，實際有效約 7 小時 |
| **demo 顯示裝置** | **投影機**，且**沒有時間提前試投** |
| demo 機器 | LG Gram（整合顯卡、無獨顯、螢幕 DPR 可能 1.5–2×），同時跑 Spring Boot + 前端 + 瀏覽器 |
| 開發機器 | 另一台效能較好的主機 → **必須在 LG Gram 上實測，不可只在開發機驗證** |
| demo 流程 | 登入 → 新增問卷 → 編輯問卷 → 填答（存 session → DB）→ admin 統計，共 5 個畫面 |

## demo 的目標

後端與前端功能全班同源（老師提供的範例），**UI/UX 是唯一的差異化維度**，
目的是取得未來與同學合作專案時的話語權，之後也作為面試作品。

## 現況事實（已查證）

- 前端 Angular 19 + Angular Material 19 + SCSS，12 個頁面、66 個檔案
- 後端 Spring Boot（Java / Gradle）
- 無 Tailwind、無 shadcn、無 i18n
- `styles.scss` 用 `mat.theme()`（M3 token API，產出 `--mat-sys-*` CSS custom properties）
- **主題定義重複**：`angular.json` 載入 prebuilt `azure-blue.css`，`styles.scss` 又 `@include mat.theme()` 用 cyan + orange
- **深色模式被程式碼明文封死**：`body` 上有 `color-scheme: light` 與 `background-color/color` 的 `!important`，`mat.theme()` 硬編 `theme-type: light`
- `styles.scss` 底部有一套手寫的 Tailwind 仿製 utility class（`.flex`、`.gap-1`…），與 Tailwind **class 名稱完全撞號**
- 現有色票：`--primary-color: #8D6E63`（棕）、`--bg-beige: #F5F1EE`（米白）
- **`index.html` 從 Google CDN 載入 Roboto 與 Material Icons** → 離線或網路不穩時所有 `<mat-icon>` fallback 成文字，版面全爆。單點故障。
- `<html lang="en">` 但內容全中文
- 填答頁是**一頁列出所有問題**（不是一題一頁）

## 核心設計論證：投影機推翻了「細緻通透」

投影機在明亮環境下實際對比常低於 50:1（規格 1000:1 是全暗房數據），
且投影會吃掉飽和度、模糊細節。因此以下東西**在投影機上不存在**：

- 低飽和高級灰階 → 一整片沒有層次的糊灰
- 黑色／深色底 → 暗部細節併成一團
- `rgba(255,255,255,0.08)` 的細緻玻璃面 → 看不見
- `1px / 0.2 opacity` 髮絲邊框 → 消失
- 噪點材質、微妙 inset 高光 → 消失
- 邊緣折射位移幾個 pixel → 看不出來

**「細緻通透」與「投影機」天生對立**（細緻＝低對比，投影機唯一能忠實傳遞的是高對比）。

投影機能傳遞的，按價值排序：
1. ★★★ 色彩與構圖的大膽度、高對比
2. ★★★ 大字級、清晰的視覺層次
3. ★★★ 緩慢、大幅度的動畫（投影傳遞「運動」，傳不了「細節」；快動畫會拖影變糊）
4. ★★★ 現場切換深淺色（戲劇性動作，全場都看得見）
5. ★★ 全站風格一致
6. ★★ 大面積、高對比的玻璃模糊
7. ★ 邊緣折射
8. ✗ 噪點、細緻材質、低飽和微妙層次

## 已決定的決策

| # | 決策 | 理由 |
|---|---|---|
| 1 | **今天不改寫成 React**，留在 Angular 19 | Liquid glass 的本體是 CSS + SVG filter + shader，與 React 無關。卡住的從來不是框架。改寫是 demo 之後才談的事 |
| 2 | **保留 Angular Material**，token 全域覆寫；只有 navbar 與 glass surface 手寫成純 Angular + Tailwind component | 12 頁 template 一行都不用改。`::ng-deep` 的醜只有自己看得到 |
| 3 | **今天不引入 spartan/ui** | 它是 shadcn 的 Angular 移植（brain = Angular CDK primitives、helm = Tailwind 樣式，41 個移植了 30 個）。換掉所有 `mat-*` today 做不完，且與「改寫 React」的選項互斥 |
| 4 | **Tailwind v3，不用 v4** | v4 的 CSS-first config 需 `@tailwindcss/postcss`，與 Angular 19 esbuild pipeline 有已知摩擦。7 小時不賭 |
| 5 | 玻璃只做 **Level 1（純 CSS glassmorphism）**，全站套用 | Level 2（SVG `feDisplacementMap` 真折射，3.5h）與 WebGL shader 背景（+2h）在投影機上價值接近零，共 5.5h／44% 工時不會被任何人看到 |
| 6 | **Level 2 折射與 WebGL 延後到 demo 之後的作品集階段** | 那是給面試官在**螢幕**上看的武器。兩個場景需要兩種視覺策略 |
| 7 | 背景用 **純 CSS 動畫漸層** | 零 GPU 風險。投影機模糊會吃掉 WebGL simplex noise 的細節優勢 |
| 8 | 主色 **深藍紫（indigo/violet，低飽和），飽和度比直覺高一階** | 藍紫在淺色與深色模式都撐得住（粉色在深色底會變濁）；冷色底 + 暖色高光才能讓折射邊緣看得見；符合 SaaS/數據語意。粉、青作為光暈與 accent |
| 9 | 一套 **「投影機優先」參數**（非兩套） | 明天的觀眾只看到投影出來的東西。邊框 opacity 0.5+ 而非 0.2、飽和度往上、高光加粗、圓角加大、字級 +2~4px |
| 10 | **預設淺色**，demo 中段刻意切深色當展示動作 | 投影在明亮環境下淺色才有對比；深色版光暈刻意開得比「正常」更強 |
| 11 | 切換用 **圓形揭露動畫**（View Transitions API + `clip-path: circle()`），localStorage 記憶 | 40 分鐘買一個全場有反應的瞬間，回報率比 3.5h 的邊緣折射高一個量級。Chrome 原生支援 |
| 12 | 字體 **Noto Sans TC 500/700 + Inter 500/600/700，全部本地 woff2** | localhost demo 不經網路，檔案大小不重要，**不需要 subset**。**字重不得低於 500**：投影機上細筆畫會消失或斷裂，中文尤其嚴重。數字用 tabular-nums |
| 13 | 動畫走 **`motion` 套件**（framework-agnostic 核心，約 12KB），非 Angular Animations | spring 手感明顯更好，未來遷 React 時知識可轉移 |
| 14 | 動畫**慢而大**：時長 400–700ms、位移 24–40px | 快速微動畫（150ms／4px）在投影機上拖影變糊，觀眾看不到 |
| 15 | **i18n（中英文）延後到 demo 之後** | 12 頁文案抽取 + 後端問卷內容多語欄位設計 + `@angular/localize`／ngx-translate，是獨立一整套工程。明天 demo 全中文 |
| 16 | 明天用 **production build**，非 dev server | dev server 無最佳化、帶 sourcemap，在 LG Gram 上明顯更慢。**測 dev server 等於沒測** |
| 17 | 階段式推進，**每階段結束都是可 demo 的完整狀態** | 降級結果是「全站好看 + 前面幾個畫面驚人」，而非「三個好看 + 兩個舊 Material」。風格斷裂比平庸更傷 |

## 執行中的發現與計畫修正

### 修正 1：手寫 utility class 不刪（原計畫寫「全刪讓 Tailwind 接手」）

`styles.scss` 共 397 行，82–387 行那套手寫 utility **混了兩類東西**：

- 與 Tailwind 撞號的（`.flex`、`.gap-*`、`.p-*`、`.text-*`、`.rounded*`…）
- Tailwind **沒有**的專案自訂語意 class（`.card-grid`、`.badge`、`.badge-success`、
  `.text-danger`、`.text-muted`、`.min-h-form`、`.border-accent-l`、`.bg-accent-tint`…）

全刪會讓 12 頁破版。且 `.flex-grow` 在 Tailwind v3 裡叫 `grow`（無 `flex-grow`），保留是必要的。

**已逐項比對撞號 class 的數值，與 Tailwind v3 完全一致**（gap 0.25/0.5/0.75/1/1.25/1.5/2rem、
padding 同、字級 .875/1.125/1.25/1.5rem、圓角 4/8/12px = 0.25/0.5/0.75rem）——
原作者是照 Tailwind 數值手抄的。因此：

> **保留整段不動，`@tailwind utilities` 放在檔案最後讓 Tailwind 勝出。數值相同 → 零版面位移風險。**

已驗證：產出的 `styles.css` 裡 `.flex` 出現兩次且內容完全相同。

### 修正 2：`theme-type: color-scheme` 可用，不需要產生兩套 token

Angular Material 19.2 的 `mat.theme()` 接受 `theme-type: color-scheme`，
產出 `--mat-sys-primary: light-dark(#7d00fa, #d5baff)` 這種形式，
靠 `html` 的 `color-scheme` property 自動切換 → CSS 體積只需一套。已驗證生效。

### 修正 3：字體設定被檔案尾端的重複定義覆蓋

`styles.scss` 尾端（原 389–397 行）重複貼了一份 `html,body { height:100% }` 與
`body { margin:0; font-family:Roboto }`，與檔案開頭的定義重複且在後面勝出，
所以第一次改字體時 `body` 的 computed font 仍是 Roboto。已移除尾段那份。

### 修正 4：`@fontsource/material-icons` 不含 ligature class

Google CDN 那份 CSS 有附 `.material-icons` 的 ligature 設定，`@fontsource` 版**只有 `@font-face`**。
本專案所有 icon 都是 ligature 模式（`<mat-icon>menu</mat-icon>`，已確認無 `svgIcon` 用法），
少了那組設定圖示會全部顯示成英文字。已在 `styles.scss` 補上 `.material-icons, .mat-ligature-font`。

### 修正 5（重要）：裝 Tailwind 讓一批「死 class」全部復活

`template` 原本就照 Tailwind 的寫法寫了顏色 class —— `bg-white`(8)、`text-gray-500`(6)、
`text-indigo-600`(3)、`text-gray-800`(3)、`bg-indigo-50`、`border-gray-200`、
`!bg-green-100` 等，共 28 種、約 55 個使用點。但專案一直沒裝 Tailwind，
**這些 class 全都是無效的死 class**。裝上 Tailwind 後它們一次全部生效，
而它們全是為「淺色底」寫死的，深色模式下產生大量不可讀組合。

實測到的具體災難：

- `.bg-white` → 純白底 + 繼承的淺紫白文字 = 白底淺字。8 處頁面的卡片容器都是它
  （那些頁面**沒有用 mat-card**，是 `<div class="bg-white rounded-lg shadow">`）
- `.text-gray-800` → `rgb(31,41,55)` 深灰配深底
- `.mat-mdc-table` 的 `background: transparent` 被 Material component style 蓋回
  `--mat-sys-surface`（深色 ≈ `#151316`），那塊近黑蓋在容器上 —— 這就是深色模式下
  表格變成一塊實心黑的原因

一併發現 `styles.scss` 既有的手寫語意色也是硬編淺色底的值：
`.text-success #2e7d32`、`.text-link #1976d2`、`.bg-subtle #f5f5f5`、`.bg-accent-tint #ede7f6`。

**解法**：在 `@tailwind utilities` 之後加一層「深淺色適配層」，把兩批都重新映射到 glass token。
`.bg-white` 在**兩個模式**都改成玻璃 —— 深色修可讀性，淺色順便解決通透感問題。

**通用教訓（已重複踩到三次）**：覆寫 Angular Material 必須**餵 `--mdc-*` / `--mat-*` token**，
不能直接寫屬性。mdc 內部規則的 specificity 高於 `.mat-mdc-*`，直接寫的屬性會被靜默蓋掉。
已知踩點：card 的 `box-shadow`（inset 高光整個消失）、table 的 `background`。

### 修正 6：背景飽和度是連鎖問題的源頭

第一版 `--grad-opacity` 淺色 0.55 / 深色 0.75 太搶戲，畫面變成
「艷麗漸層背景 + 白色/黑色盒子」，不是 rondesignlab 那種質感。

關鍵因果：**背景越艷 → 卡片必須越不透明才讀得到字 → 卡片變成實心盒子 → 通透感消失。**
所以降背景飽和不是「讓畫面變淡」，是**讓卡片能更透**，兩件事一起改善。

已調整為 `--grad-opacity` 0.30 / 0.42、`--glass-bg` 淺色 0.52 / 深色 0.48，
並在 aurora 加一層中央柔化遮罩（`.aurora__veil`，radial-gradient 中央濃邊緣透），
讓內容區後方乾淨、色彩退到畫面邊緣 —— 同時解決「內容少的頁面下半部裸露大片飽和色塊」。

### 高槓桿發現：既有頁面自動支援深色模式

12 個既有頁面全都透過 `var(--primary-color)` 與 `var(--bg-beige)` 取色。
因此**只要在 `html.dark` 下覆寫這兩個變數，12 頁就自動支援深色模式**，不需改任何 template。
`--bg-beige` 的名稱現在語意已錯（不再是米色），但改名要動 12 頁，不值得——刻意保留名稱只換值。

## Level 1 玻璃化的套用範圍

5 個 demo 畫面全部套用。填答頁採層次策略：

> **外層大玻璃板**（包住所有問題）+ **內部小玻璃卡**（每個問題）。
> 全部同等強度會糊成一團、看不出層級。

## 執行順序（按投影機可見度排序）

```
1. [15min] 本地化 Google Fonts + Material Icons（消除單點故障）
2. [10min] git 安全點 + 本檔
3. [30min] 字體 Noto Sans TC + Inter
4. [1.5h]  Tailwind v3 + glass token + 深淺色機制 + 拆掉硬鎖亮色的舊 code
5. [40min] 圓形揭露的深淺色切換動畫
6. [1h]    CSS 動畫漸層背景
7. [2h]    Navbar 重做（依 design/navbar.txt）
8. [1.5h]  全站 Level 1 玻璃化 + 字級／間距放大
9. [1h]    動畫三項：路由過場、卡片 stagger、統計數字 count-up
10.[1h]    LG Gram 實測 production build 並調參  ← 不可省略
```

合計約 9.5h vs 可用 7h。**每一步做完就 commit，做到哪算哪。**
最可能被犧牲的是第 8、9 項的一部分；**第 10 項必須留住**。

## 分支策略

- `main` 保持在 2026-08-11 的可運作狀態，作為 demo 前的保命符（`git checkout main` 即可回退）
- 視覺重構在 `feat/liquid-glass-ui` 進行

## demo 之後的待辦（不在今天範圍）

- Level 2 折射：做成可複用的 `[glassRefract]` directive（共用一個 SVG filter id），套用於 navbar、登入卡、dialog、統計圖表卡、編輯器 step 容器。**不套**列表每一列、下拉 option、按鈕（太小看不出，Level 1 高光更好看）
- 效能界線：`feDisplacementMap` + `backdrop-filter` 每個實例是獨立 GPU 合成層。「大面積、數量少」安全；「數量多又會滾動」會掉幀
- WebGL shader 背景（0.4–0.5× render scale + 掉幀自動降級回 CSS 版）
- i18n 中英文雙語（含後端問卷內容的多語欄位設計）
- 「細緻通透」的螢幕版視覺參數（低對比、細邊框、噪點）
- 是否改寫成 React + Tailwind + shadcn／或改用 spartan/ui 漸進替換 Material
- 寫 `CONTEXT.md`（AGENTS.md 指定要有但尚不存在）與 ADR：「為何留在 Angular」、「為何投影優先」
- 驗證 React vs Angular 的實際職缺數據（104／LinkedIn 的職缺量與薪資帶）以決定長期技術投資方向
```

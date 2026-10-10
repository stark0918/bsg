# 劇空間棒球 ～ GEKIKUUKAN BASEBALL

復古 CGI 風格的棒球遊戲。**成品是單一 HTML 檔，雙擊即可玩，不需要伺服器、不需要安裝。**

## 給玩家

直接開啟 `劇空間棒球.html` 就能玩。存檔存在瀏覽器（localStorage），關掉再開可「繼續球季」。

## 給開發者：模組化架構

原始碼拆成多個模組放在 `src/`，用 `build.ps1` 打包成單一 HTML。
**請編輯 `src/` 裡的檔案，不要直接改 `劇空間棒球.html`**（那是產生出來的成品，重新打包會被覆蓋）。

> 為什麼不用 ES 模組（`import` / `export`）？
> 原生 ES 模組透過 `file://` 直接開啟會被瀏覽器以 CORS（origin 為 `null`）擋下，
> 必須有伺服器或打包工具才能跑。為了維持「雙擊就能玩」，這裡改成：
> 各模組照順序串接，再包進一個 IIFE，模組間透過同一作用域互相呼叫。

### 檔案結構

```
劇空間棒球.html        # 打包成品（單一檔，給玩家）
build.ps1              # 打包腳本（PowerShell 5.1）
build.cmd              # 雙擊即可打包
src/
  index.template.html  # HTML 外殼 + CSS，含 /*__BUNDLE__*/ 佔位標記
  outname.txt          # 產出的檔名
  js/
    00-tools.js        # 基本工具：$、clamp、隨機、格式化、亂數種子(hashStr/mulberry32)
    05-sound.js        # 熱血音效：WebAudio 合成（PLAY BALL、全壘打、三振、奪冠等）
    10-data.js         # 名稱池、球隊定義(8隊)、生涯(年齡與成長) CAREER
    20-roster.js       # 球員產生與 getTeam（依隊伍種子，決定性）
    30-engine.js       # 投打模型、壘上推進、打席處理、球速與演出、單場英雄、CPU AI、玩家戰術
    40-season.js       # 賽程、快速模擬、個人成績合成/合併、賽結束處理、聯盟快報
    45-playoff.js      # 季後賽：前4名籤表、準決賽/冠軍戰（best-of）、模擬與推進
    46-history.js      # 遊戲紀錄：逐場賽果、跨季生涯摘要、生涯里程碑
    47-records.js      # 單場紀錄簿（本季＋生涯，含季後賽）
    48-draft.js        # 新人選秀：依戰績決定指名順序、玩家互動指名
    49-awards.js       # 個人獎項：MVP、最佳投手、新人王、各項王
    50-state.js        # 存檔、遊戲狀態 S、新球季、舊存檔遷移、排名計算
    60-ui-core.js      # render() 與假 CGI 網址列
    70-ui-views.js     # 各畫面：標題/選隊/總部/比賽/陣容/能力/資料卡/賽程/排名/排行/說明
    80-actions.js      # 事件分派（ACT）與點擊委派
    90-main.js         # 啟動：loadCareer(); render();
    99-debug.js        # 開發用：把 API 掛到 window.GK（可整段刪除）
```

模組載入順序由 `build.ps1` 的 `$order` 控制。因為全部串接進同一個 IIFE 作用域，
`const` / `let` 的初始化順序＝檔案的先後順序，所以順序不能隨意更動。

### 打包

```
powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1
```
或直接雙擊 `build.cmd`。

打包流程：讀取 `index.template.html` → 依序串接 `src/js/*` → 外層包一個
`(function(){ "use strict"; ... })();` → 取代 `/*__BUNDLE__*/` → 輸出單一 HTML。

### 除錯

打包後在瀏覽器 Console 可用 `window.GK`，例如：

```js
GK.S.season.day                 // 目前賽程天數
GK.getTeam('azure').batters     // 某隊野手
GK.CAREER                       // 跨季成長資料
GK.advanceCareer()              // 手動推進一季（會老化全聯盟）
```

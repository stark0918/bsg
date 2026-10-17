# 球團物語 — 專案／協作規範

## 成品與架構
- 成品：`index.html`（單一檔，雙擊即玩，不需要伺服器；同名方便直接掛 GitHub Pages 首頁）。
- 原始碼在 `src/`。**只改 `src/`，不要直接改成品**（重新打包會被覆蓋）。
- 打包：`powershell -NoProfile -ExecutionPolicy Bypass -File .\build.ps1`
  （或直接雙擊 `build.cmd`）。
- 打包是可重現的：打包後 `git status` 應保持乾淨（成品與 `src/` 同步）。
- 測試版發布：`.\publish-beta.ps1`（或雙擊 `publish-beta.cmd`）＝打包本分支
  ＋把成品同步到正式版 worktree 的 `beta/index.html`，正式版主頁線上入口才點得到。

## Commit 節奏（重要）
採「**一個功能一段**」：

1. 做完一個「**能跑、且只做一件事**」的功能，才 commit 一次。
2. 同一次 commit 不要混入不相關的修改。
3. Commit 前必做：
   - 改 `src/`
   - 跑 `build.ps1`
   - 瀏覽器開 `index.html` 實際測一下
   - 確認沒問題，**才** commit
4. Commit 訊息用一句話說明「**做了什麼、為什麼**」。
5. 重要里程碑建立 tag（`v01`、`v02`…）。
6. **未經確認不要自動 commit**；等一個功能真的完成再提交。

## 版控
- 分支：單人小專案直接在 `main` 工作即可，非必要不開分支。
- 歷史已重建為 `v01`–`v08`（見 tag）；**不要隨意改寫歷史**。
- 建議另推一份到雲端（GitHub / GitLab）當備份；本機 git 不等於備份。

## 快速指令
```powershell
git log --oneline --decorate --all      # 看全部版本
git show v03 --stat                     # 看某版改了什麼
git switch --detach v05                 # 回到 v05 試玩
git switch main                         # 回到最新
```

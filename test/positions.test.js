"use strict";
/* 守位指派／選秀位置覆蓋的離線測試。
   直接載入 src/js 的模組（和 build.ps1 相同的順序），不需要瀏覽器。
   執行：node test/positions.test.js */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..", "src", "js");
const files = [
  "00-tools.js", "09-config.js", "10-data.js", "20-roster.js",
  "30-engine.js", "40-season.js", "47-records.js", "48-draft.js", "50-state.js"
];
const store = {};
const ctx = {
  console, Math, Date, JSON, Set, Map, Array, Object, String, Number, isNaN, assert,
  localStorage: {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  },
  document: {
    querySelector: () => null,
    addEventListener: () => {},
    getElementById: () => null,
    createElement: () => ({ style: {}, appendChild: () => {}, remove: () => {}, click: () => {} }),
    body: { appendChild: () => {} }
  },
  window: {},
  Blob: function () {},
  URL: { createObjectURL: () => "", revokeObjectURL: () => {} },
  setTimeout, clearTimeout,
  SFX: new Proxy({}, { get: () => () => {} }),
  render: () => {}, flash: () => {}, saveCareer: () => {}, saveGame: () => {}, saveConfig: () => {}
};
vm.createContext(ctx);
for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
}

const result = vm.runInContext(String.raw`
/* 測試用的球季骨架 */
S.season = {
  playerTeam: "azure", playerStats: { bat: {}, pit: {} },
  schedule: [], records: {}, day: 0, draftLog: [], drafted: false, draft: null
};
CAREER.lineups = {};
CAREER.dhSlot = {};
CAREER.seasons = 0;

const out = [];

/* 1. 預設打線：扣掉 DH 後，8 個守位各一人 */
TEAM_DEFS.forEach(def => {
  const t = getTeam(def.id);
  const lu = buildLineup(t);
  assert.strictEqual(lu.length, 9, def.id + " 預設打線應為 9 人");
  const dhIdx = dhSlotOf(def.id);
  const a = assignFieldPositions(lu, lu[dhIdx].id);
  const seen = {}, pids = {};
  Object.keys(a.map).forEach(pid => {
    assert(!pids[pid], def.id + " 重複指派 " + pid);
    pids[pid] = 1;
    const pos = a.map[pid];
    if (pos !== "DH") {
      assert(!seen[pos], def.id + " 重複守位 " + pos);
      seen[pos] = 1;
    }
  });
  FIELD_POS.forEach(pos => assert(seen[pos], def.id + " 缺少守位 " + pos));
  assert.strictEqual(Object.keys(a.map).length, 9);
  out.push({ test: "default", team: def.id, map: a.map });
});

/* 2. 自動排打線：9 人、8 守位各一人、DH 不在守位上，且守位適配分數合理 */
TEAM_DEFS.forEach(def => {
  const t = getTeam(def.id);
  const r = autoLineup(t);
  assert.strictEqual(r.ids.length, 9, def.id + " 自動打線應為 9 人");
  assert.strictEqual(new Set(r.ids).size, 9, def.id + " 自動打線有重複球員");
  assert(r.dhPid && r.ids.indexOf(r.dhPid) >= 0, def.id + " 自動打線沒有 DH");
  const byId = {};
  t.batters.forEach(b => { byId[b.id] = b; });
  const lu = r.ids.map(id => byId[id]);
  assert(lu.every(Boolean), def.id + " 自動打線含不存在的球員");
  const a = assignFieldPositions(lu, r.dhPid);
  const seen = {};
  Object.keys(a.map).forEach(pid => {
    const pos = a.map[pid];
    if (pos !== "DH") {
      assert(!seen[pos], def.id + " 自動打線重複守位 " + pos);
      seen[pos] = 1;
    }
  });
  FIELD_POS.forEach(pos => assert(seen[pos], def.id + " 自動打線缺少 " + pos));
  assert.strictEqual(a.map[r.dhPid], "DH", def.id + " DH 不在 DH 位置");
  const atC = lu.find(b => a.map[b.id] === "C");
  assert(atC && (atC.pos === "C" || atC.pos2 === "C"), def.id + " 捕手不是捕手");
  FIELD_POS.forEach(pos => {
    const p = lu.find(b => a.map[b.id] === pos);
    assert(p && posFitScore(p, pos) >= 40, def.id + " " + pos + " 適配分數過低：" + (p ? posFitScore(p, pos) : "無"));
  });
  out.push({ test: "auto", team: def.id, ids: r.ids, dh: r.dhPid, dhIdx: r.dhIdx, map: a.map });
});

/* 2b. DH 不讓守位開天窗：預設打線扣掉 DH 後，8 名守備員都應在本職守位 */
TEAM_DEFS.forEach(def => {
  const t = getTeam(def.id);
  for (let n = 0; n < 80; n++) {
    const dhIdx = dhSlotOf(def.id);
    const lu = buildLineup(t);
    const a = assignFieldPositions(lu, lu[dhIdx].id);
    lu.forEach((b, i) => {
      if (i !== dhIdx) assert.strictEqual(a.map[b.id], b.pos, def.id + " 的 DH 讓 " + b.name + " 客串");
    });
  }
  out.push({ test: "dh-coverage", team: def.id, ok: 80 });
});

/* 3. 隨機手動打線：不管怎麼排，指派結果仍是 8 個不重複守位 + DH */
TEAM_DEFS.forEach(def => {
  const t = getTeam(def.id);
  for (let n = 0; n < 120; n++) {
    const arr = t.batters.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    const lu = arr.slice(0, 9);
    const dh = lu[Math.floor(Math.random() * lu.length)];
    const a = assignFieldPositions(lu, dh.id);
    const seen = {};
    Object.keys(a.map).forEach(pid => {
      const pos = a.map[pid];
      if (pos !== "DH") {
        assert(!seen[pos], def.id + " 隨機打線重複守位 " + pos);
        seen[pos] = 1;
      }
    });
    FIELD_POS.forEach(pos => assert(seen[pos], def.id + " 隨機打線缺少 " + pos));
    assert.strictEqual(a.map[dh.id], "DH");
  }
  out.push({ test: "random", team: def.id, ok: 120 });
});

/* 4. 選秀：新人接手同一個名額，守位／副守位不變，預設打線仍覆蓋 8 個守位 */
const tid = TEAM_DEFS[0].id;
let t = getTeam(tid);
const old = t.batters.find(b => (b.age || 26) >= 38) || t.batters[0];
CAREER.ov[old.id] = CAREER.ov[old.id] || {};
CAREER.ov[old.id].age = 38;          // 強制制造一個退休缺口
delete teamCache[tid];
t = getTeam(tid);
const old2 = t.batters.find(b => b.id === old.id);
assert(old2 && old2.age >= 38, "退休缺口沒有生效");

prepareDraft();
assert(S.season.draft && S.season.draft.picks.length >= 1, "選秀沒有產生指名權");
const dpick = S.season.draft.picks.find(p => p.teamId === tid) || S.season.draft.picks[0];
const slot = getTeam(dpick.teamId).batters.find(b => b.id === dpick.pid);
const beforePos = slot.pos, beforePos2 = slot.pos2;
const cands = draftCandidates(dpick);
assert.strictEqual(cands.length, 4, "選秀候補應為 4 人");
applyDraftRookie(dpick, cands[0]);
delete teamCache[dpick.teamId];
const after = getTeam(dpick.teamId).batters.find(b => b.id === dpick.pid);
assert(after, "選秀後找不到名額");
assert.strictEqual(after.pos, beforePos, "選秀後本職守位被改變");
assert.strictEqual(after.pos2, beforePos2, "選秀後副守位被改變");

const lu3 = buildLineup(getTeam(dpick.teamId));
const dh3 = dhSlotOf(dpick.teamId);
const a3 = assignFieldPositions(lu3, lu3[dh3].id);
const seen3 = {};
Object.keys(a3.map).forEach(pid => {
  const pos = a3.map[pid];
  if (pos !== "DH") {
    assert(!seen3[pos], "選秀後重複守位 " + pos);
    seen3[pos] = 1;
  }
});
FIELD_POS.forEach(pos => assert(seen3[pos], "選秀後缺少守位 " + pos));
out.push({ test: "draft", team: dpick.teamId, pid: dpick.pid, pos: beforePos, pos2: beforePos2, ok: true });

JSON.stringify(out, null, 2);
`, ctx);

const parsed = JSON.parse(result);
console.log("positions.test.js PASS");
console.log("  default lineups:", parsed.filter(x => x.test === "default").length);
console.log("  auto lineups:", parsed.filter(x => x.test === "auto").length);
console.log("  dh coverage:", parsed.filter(x => x.test === "dh-coverage").length, "(80/team)");
console.log("  random lineups:", parsed.filter(x => x.test === "random").length, "(120/team)");
console.log("  draft:", JSON.stringify(parsed.find(x => x.test === "draft")));

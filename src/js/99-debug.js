/* ====================================================================
   除錯／開發用：把主要 API 掛到 window.GK，方便在瀏覽器 Console 檢視。
   遊戲本身不依賴這個區塊，可整段刪掉不影響運作。
   例： GK.S.season.day、GK.getTeam('azure').batters、GK.advanceCareer()
   ==================================================================== */
window.GK = {
  get S(){ return S; },
  get CAREER(){ return CAREER; },
  set CAREER(v){ CAREER = v; },
  get teamCache(){ return teamCache; },
  saveGame, loadGame, hasSave, loadCareer, saveCareer,
  newSeason, migrateSeasonStats,
  getTeam, playerById, playerOverall, gradeOf, gradeBadge, ageNote,
  advanceCareer, applyOv, leadersList, leadersQualify,
  processGameEnd, startMatch, autoGame, quickSim, teamStrength,
  ensurePlayoff, playoffProgress, playoffNextGame, playoffSimAll, startPlayoffMatch,
  finalizeSeason, logGame, viewHistory, render, viewAbilities, ACT,
  seasonCSV, careerMerged, viewRecords, viewPlayer, viewLeague, viewGameDetail,
  viewAwards, computeAwards, playerAwards,
  viewSaveManager, exportPayload, payloadMeta, readSlot, writeSlot, deleteSlotStorage,
  applyPayload, exportSaveFile, importSaveText, importSaveFile, normalizeCareer,
  recordSeasonBest, checkMilestones, detectNoHitter, recordNoHitter, playerMilestones, recTabSeasonBest, seasonBestUp,
  buildDayPaper, gameHeadline, paperBlock,
  viewLineup, buildLineup, buildBench, setPlayerLineup, defaultLineup, luStatLine,
  asReady, asPick, ensureAllstarRoster, simAllstar, viewAllstar, asStrength,
  rollCond, effOf, rollForm, batterEffective, formOf, momOf, momStat, pushMom, momBand, leverageOf, applyClutch,
  dhSlotOf, setDHSlot, pickBestDH, pickSawamura, computeAwards, careerGateMin,
  get CFG(){ return CFG; }, cfg, saveConfig, resetConfig, CONFIG_DEF, CFG_LIMITS,
  seasonNo, viewSeasonInfo, lastTeamId, prepareDraft, histGamesPanel
};

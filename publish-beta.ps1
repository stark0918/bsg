# 把 beta 分支（測試版工作樹）打包並同步成品到 main 的 beta/index.html。
# 主線 build.ps1 不會動這個檔案；同步後記得 commit。
$ErrorActionPreference = "Stop"
$proj = Split-Path -Parent $MyInvocation.MyCommand.Path
$betaDir = $null
foreach ($line in (git worktree list)) {
  if ($line -match '\[beta\]') { $betaDir = ($line -split '\s+')[0]; break }
}
if (-not $betaDir) { throw "找不到 beta 分支的工作樹（git worktree list 沒有 [beta]）" }
Write-Host ("beta dir: " + $betaDir)
powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $betaDir "build.ps1")
$dstDir = Join-Path $proj "beta"
if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory $dstDir | Out-Null }
Copy-Item (Join-Path $betaDir "index.html") (Join-Path $dstDir "index.html") -Force
Write-Host "published -> beta/index.html"

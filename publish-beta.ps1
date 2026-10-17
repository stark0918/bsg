$ErrorActionPreference="Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1) build the beta game in this worktree
& (Join-Path $here "build.ps1")

# 2) locate the main worktree of the same repo (branch main) via git
$prevEnc = [Console]::OutputEncoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
try{
  $mainWt = $null
  $cur = $null
  foreach($line in (git -C $here worktree list --porcelain)){
    if($line.StartsWith("worktree ")) { $cur = $line.Substring(9) }
    elseif($line -eq "branch refs/heads/main") { $mainWt = $cur }
  }
} finally {
  [Console]::OutputEncoding = $prevEnc
}
if(-not $mainWt){ throw "main worktree not found" }

# 3) copy the artifact so the official site serves it at /beta/index.html
$dstDir = Join-Path $mainWt "beta"
if(-not (Test-Path -LiteralPath $dstDir)){ New-Item -ItemType Directory -Path $dstDir | Out-Null }
$dst = Join-Path $dstDir "index.html"
Copy-Item -LiteralPath (Join-Path $here "index.html") -Destination $dst -Force
Write-Host ("synced -> " + $dst)

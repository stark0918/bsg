$files = @(
    "src/js/00-tools.js",
    "src/js/05-sound.js",
    "src/js/10-data.js",
    "src/js/20-roster.js",
    "src/js/30-engine.js",
    "src/js/40-season.js",
    "src/js/45-playoff.js",
    "src/js/46-history.js",
    "src/js/47-records.js",
    "src/js/48-draft.js",
    "src/js/49-awards.js",
    "src/js/50-state.js",
    "src/js/60-ui-core.js",
    "src/js/70-ui-views.js",
    "src/js/80-actions.js",
    "src/js/90-main.js",
    "src/js/99-debug.js"
)

foreach ($f in $files) {
    try {
        $content = Get-Content $f -Raw -Encoding UTF8
        $open = ($content -split '{').Length - 1
        $close = ($content -split '}').Length - 1
        if ($open -ne $close) {
            Write-Host "$f : open=$open, close=$close, diff=$($open-$close)"
        } else {
            Write-Host "$f : OK"
        }
    } catch {
        Write-Host "$f : ERROR - $($_.Exception.Message)"
    }
}
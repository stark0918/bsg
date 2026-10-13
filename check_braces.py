import os, sys
files = [
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
    "src/js/99-debug.js",
]
for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as fp:
            content = fp.read()
        open_count = content.count('{')
        close_count = content.count('}')
        if open_count != close_count:
            print(f"{f}: open={open_count}, close={close_count}, diff={open_count-close_count}")
        else:
            print(f"{f}: OK (balanced)")
    except Exception as e:
        print(f"{f}: ERROR - {e}")
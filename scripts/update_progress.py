"""Read the Progress column from the CNAP Phase S Smartsheet and write progress.json.

Runs in GitHub Actions. Needs the SMARTSHEET_TOKEN repository secret.
Read-only: it never writes to Smartsheet.
"""
import json, os, sys, urllib.request
from collections import Counter
from datetime import datetime
from zoneinfo import ZoneInfo

SHEET_ID = 4867656760119172
STATUSES = ["Not Started", "In Progress", "Ready for Review", "Applying Reviewer Feedback", "Finalized"]

token = os.environ.get("SMARTSHEET_TOKEN", "").strip()
if not token:
    sys.exit("SMARTSHEET_TOKEN secret is missing.")

def get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)

cols = get(f"https://api.smartsheet.com/2.0/sheets/{SHEET_ID}/columns?includeAll=true")["data"]
col = next((c for c in cols if c["title"] == "Progress"), None)
if col is None:
    sys.exit("No 'Progress' column found in the sheet.")

sheet = get(f"https://api.smartsheet.com/2.0/sheets/{SHEET_ID}?columnIds={col['id']}")
counts = Counter()
for row in sheet.get("rows", []):
    val = None
    for cell in row.get("cells", []):
        if cell.get("columnId") == col["id"]:
            val = cell.get("displayValue") or cell.get("value")
    val = (str(val).strip() if val is not None else "")
    counts[val or "(blank)"] += 1

now = datetime.now(ZoneInfo("America/Chicago"))
hour = now.strftime("%I").lstrip("0")
out = {
    "updated": now.isoformat(timespec="seconds"),
    "updatedLabel": f"{now:%a, %b} {now.day}, {now.year}, {hour}:{now:%M %p} CT",
    "total": sum(counts.values()),
    "counts": {s: counts.get(s, 0) for s in STATUSES},
}
out["counts"]["No status yet"] = counts.get("(blank)", 0)
for k, v in counts.items():
    if k not in STATUSES and k != "(blank)":
        out["counts"][f"Other: {k}"] = v
        print(f"Unexpected Progress value: {k!r} ({v})")

with open("progress.json", "w") as f:
    json.dump(out, f, indent=2)
    f.write("\n")
fin = out["counts"]["Finalized"]
print(f"{fin} of {out['total']} finalized ({round(100 * fin / out['total']) if out['total'] else 0}%)")

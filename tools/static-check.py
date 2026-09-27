#!/usr/bin/env python3
"""Check local JS/TS syntax and HTML asset references; no network or database access."""
import json
from html.parser import HTMLParser
from pathlib import Path
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]


class AssetParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.inline_scripts = []
        self.current_script = None
        self.script_type = ""

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag in ("script", "img", "link"):
            reference = attrs.get("href" if tag == "link" else "src")
            if reference:
                self.references.append(reference)
        if tag == "script" and not attrs.get("src"):
            script_type = attrs.get("type", "").lower()
            if script_type in ("", "text/javascript", "application/javascript", "module"):
                self.current_script = []
                self.script_type = script_type

    def handle_data(self, data):
        if self.current_script is not None:
            self.current_script.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.current_script is not None:
            self.inline_scripts.append(("".join(self.current_script), self.script_type))
            self.current_script = None


def main():
    failures = []
    checked_scripts = 0
    checked_inline = 0
    checked_references = 0
    for folder in ("assets/js", "vendor", "supabase/functions"):
        for file in sorted((ROOT / folder).rglob("*")):
            if file.is_file() and file.suffix in (".js", ".mjs", ".ts"):
                result = subprocess.run(["node", "--check", str(file)], capture_output=True, text=True)
                checked_scripts += 1
                if result.returncode:
                    failures.append(f"{file.relative_to(ROOT)}: {result.stderr.strip()}")
    for file in [ROOT / "index.html", *sorted((ROOT / "components").glob("*.html"))]:
        if not file.is_file():
            failures.append(f"Missing HTML file: {file.relative_to(ROOT)}")
            continue
        parser = AssetParser()
        parser.feed(file.read_text(encoding="utf-8"))
        for reference in parser.references:
            url = urlsplit(reference)
            if url.scheme or url.netloc or not url.path:
                continue
            target = (ROOT / unquote(url.path).lstrip("/")) if url.path.startswith("/") else (file.parent / unquote(url.path))
            checked_references += 1
            if not target.is_file():
                failures.append(f"{file.relative_to(ROOT)}: missing asset {reference}")
        for number, (script, script_type) in enumerate(parser.inline_scripts, 1):
            command = ["node", "--check"]
            if script_type == "module":
                command.append("--input-type=module")
            result = subprocess.run(command, input=script, capture_output=True, text=True)
            checked_inline += 1
            if result.returncode:
                failures.append(f"{file.relative_to(ROOT)}: inline script {number}: {result.stderr.strip()}")
    print(json.dumps({
        "status": "FAIL" if failures else "PASS",
        "scripts_checked": checked_scripts,
        "inline_scripts_checked": checked_inline,
        "local_asset_references_checked": checked_references,
        "failures": failures,
        "functional_or_database_tests": False,
    }, ensure_ascii=False, indent=2))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())

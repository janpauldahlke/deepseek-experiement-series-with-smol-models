#!/usr/bin/env python3
"""Robust truthfulness + integrity check for the rebuilt site.
- body prose (tags stripped, whitespace-normalized, known microcopy removed) must match originals
- every code block byte-identical
- div/section/tag balance, no CF/cdnjs/style leftovers on all pages
"""
import re
import sys
from html.parser import HTMLParser

POSTS = ["tool-routing", "forgetting-curve", "gbnf-grammars"]
PAGES = ["index.html", "blog/index.html", "blog/tool-routing.html",
         "blog/forgetting-curve.html", "blog/gbnf-grammars.html"]
MICROCOPY = ["code copy", "copy"]


class TextGrab(HTMLParser):
    SKIP = {"script", "style"}

    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def text_of(html):
    p = TextGrab()
    p.feed(html)
    return re.sub(r"\s+", " ", "".join(p.parts)).strip()


def clean(t):
    for mc in MICROCOPY:
        t = t.replace(mc, " ")
    return re.sub(r"\s+", " ", t).strip()


def body_div(html):
    m = re.search(r'<div class="blog-post__body">', html)
    assert m, "no body div"
    start = m.end()
    depth = 1
    i = start
    while depth and i < len(html):
        nx = html.find("<div", i)
        cx = html.find("</div>", i)
        if cx == -1:
            break
        if nx != -1 and nx < cx:
            depth += 1
            i = nx + 4
        else:
            depth -= 1
            i = cx + 6
    return html[start : i - 6]


def codes(html):
    return re.findall(
        r"<pre[^>]*class=\"code\"[^>]*><code>(.*?)</code></pre>", html, re.S
    )


fail = 0

# --- posts: truthfulness ---
for post in POSTS:
    orig = open(f"tools/orig/{post}.html", encoding="utf-8").read()
    new = open(f"blog/{post}.html", encoding="utf-8").read()

    bo, bn = body_div(orig), body_div(new)
    to, tn = clean(text_of(bo)), clean(text_of(bn))
    ok = to == tn
    print(f"[{post}] prose: {'MATCH' if ok else 'DIFF'} ({len(to)}/{len(tn)} chars)")
    if not ok:
        fail = 1
        for i, (a, b) in enumerate(zip(to, tn)):
            if a != b:
                print("  first diff at", i)
                print("  orig:", to[max(0, i - 80) : i + 120])
                print("  new :", tn[max(0, i - 80) : i + 120])
                break
        else:
            longer, shorter = (to, tn) if len(to) > len(tn) else (tn, to)
            print("  tail of longer:", longer[len(shorter) - 60 : len(shorter) + 160])

    co, cn = codes(orig), codes(new)
    same = co == cn
    print(f"[{post}] code blocks: {len(co)} vs {len(cn)}  {'MATCH' if same else 'DIFF'}")
    if not same:
        fail = 1
        for i in range(max(len(co), len(cn))):
            a = co[i] if i < len(co) else None
            b = cn[i] if i < len(cn) else None
            if a != b:
                print(f"  block {i} differs")
                break

# --- all pages: integrity ---
for page in PAGES:
    src = open(page, encoding="utf-8").read()
    problems = []
    for bad in ("cdnjs", "__CF", "cdn-cgi", "<style"):
        if bad in src:
            problems.append(f"leftover {bad}")
    od, cd = src.count("<div"), src.count("</div>")
    if od != cd:
        problems.append(f"div {od}/{cd}")
    for tag in ("section", "header", "footer", "article", "main", "nav", "figure", "table", "details"):
        o = len(re.findall(rf"<{tag}\b", src))
        c = src.count(f"</{tag}>")
        if o != c:
            problems.append(f"{tag} {o}/{c}")
    if "</html>" not in src:
        problems.append("no </html>")
    print(f"[{page}] {'OK' if not problems else 'PROBLEMS: ' + ', '.join(problems)}")
    if problems:
        fail = 1

sys.exit(fail)

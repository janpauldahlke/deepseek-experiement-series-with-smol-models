#!/usr/bin/env python3
"""Truthfulness check: compare body prose + code of new posts against the
originals fetched from the live site. Whitespace-normalized text must match."""
import re
import sys
from html.parser import HTMLParser

POSTS = ["tool-routing", "forgetting-curve", "gbnf-grammars"]


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


def grab(html, selector_div=None):
    """Return whitespace-normalized text of a div by class, or whole doc."""
    if selector_div:
        m = re.search(
            r'<div class="' + re.escape(selector_div) + r'">(.*?)(?=<div class="[^"]*__signoff|<nav class="post-nav|</div>\s*</div>\s*</article>)',
            html,
            re.S,
        )
        # simpler: capture to matching close by counting
        m = re.search(r'<div class="' + re.escape(selector_div) + r'">', html)
        if not m:
            return None
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
        html = html[start : i - 6]
    p = TextGrab()
    p.feed(html)
    return re.sub(r"\s+", " ", "".join(p.parts)).strip()


def codes(html):
    return re.findall(r"<pre class=\"code\"><code>(.*?)</code></pre>", html, re.S)


def headings(html):
    return [grab_block(m) for m in re.findall(r"<h([123])[^>]*>.*?</h\1>", html, re.S)]


def grab_block(block):
    p = TextGrab()
    p.feed(block)
    return re.sub(r"\s+", " ", "".join(p.parts)).strip()


fail = 0
for post in POSTS:
    orig = open(f"tools/orig/{post}.html", encoding="utf-8").read()
    new = open(f"blog/{post}.html", encoding="utf-8").read()

    body_o = grab(orig, "blog-post__body")
    body_n = grab(new, "blog-post__body")
    ok = body_o == body_n
    print(f"[{post}] body text: {'MATCH' if ok else 'DIFF'}  ({len(body_o)}/{len(body_n)} chars)")
    if not ok:
        fail = 1
        # locate first difference
        for i, (a, b) in enumerate(zip(body_o, body_n)):
            if a != b:
                print("  first diff at", i)
                print("  orig:", body_o[max(0, i - 80) : i + 120])
                print("  new :", body_n[max(0, i - 80) : i + 120])
                break
        else:
            print("  length diff only; tail orig:", body_o[-100:])
            print("  length diff only; tail new :", body_n[-100:])

    co, cn = codes(orig), codes(new)
    same = co == cn
    print(f"[{post}] code blocks: {len(co)} vs {len(cn)}  {'MATCH' if same else 'DIFF'}")
    if not same:
        fail = 1
        for i, (a, b) in enumerate(zip(co, cn)):
            if a != b:
                print(f"  block {i} differs")
                print("  orig:", a[:200].replace("\n", "\\n"))
                print("  new :", b[:200].replace("\n", "\\n"))
                break

    ho, hn = headings(orig), headings(new)
    # new files add post-nav titles (h? no — post-nav uses spans) but header/footer unchanged.
    if ho != hn:
        # allow new to have extra post-nav entries? post-nav uses <span>, so expect equal.
        so, sn = set(ho), set(hn)
        if so == sn:
            print(f"[{post}] headings: {len(ho)} match (order)")
        else:
            fail = 1
            print(f"[{post}] headings DIFF: only-orig={so - sn}  only-new={sn - so}")
    else:
        print(f"[{post}] headings: {len(ho)} match")

sys.exit(fail)

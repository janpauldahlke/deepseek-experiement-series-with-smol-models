#!/usr/bin/env python3
"""Transform blog/forgetting-curve.html to the new site chrome.
Body content is never touched — only head cleanup, header/footer,
terminal frames around code blocks, figure framing, post-nav, scripts."""
import re
import sys

PATH = "blog/forgetting-curve.html"
src = open(PATH, encoding="utf-8").read()
before_p = src.count("<p")
before_pre = src.count('<pre class="code">')

NEW_HEADER = """<header class="site-header">
    <div class="site-header__inner">
      <a class="brand" href="../index.html">
        <img class="brand__mark" src="../assets/eris_logo.svg" width="30" height="30" alt="" />
        <span class="brand__text">
          <span class="brand__name">ERIS</span>
          <span class="brand__tag">local-first vault agent</span>
        </span>
      </a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="primary-nav" aria-label="Toggle navigation">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav" id="primary-nav" aria-label="Primary">
        <a href="../index.html#pillars">Overview</a>
        <a href="../index.html#quickstart">Quickstart</a>
        <a href="../index.html#scope">Features</a>
        <a href="../index.html#deeper">Deep dive</a>
        <a href="../blog/" class="nav--active">Blog</a>
        <a class="nav__cta" href="https://github.com/janpauldahlke/eris">GitHub</a>
      </nav>
    </div>
  </header>"""

NEW_FOOTER = """<footer class="site-footer">
    <div class="wrap">
      <p>&copy; 2026 Jan Dahlke &middot; Apache 2.0 &middot; Built with Rust 🦀</p>
      <p>This site loads no analytics, no cookies, no third-party trackers. That is intentional and on-brand.</p>
      <p>Built with static HTML. Deploy target: Cloudflare Pages. Source: <a href="https://github.com/janpauldahlke/eris-site">github.com/janpauldahlke/eris-site</a></p>
    </div>
  </footer>"""

POST_NAV = """        <nav class="post-nav" aria-label="Post navigation">
          <span class="post-nav__slot"><span class="post-nav__dir">newer</span><a class="post-nav__title" href="tool-routing.html">How tools get picked in Eris: from grep to embeddings to grammar</a></span>
          <span class="post-nav__slot"><span class="post-nav__dir">older</span><a class="post-nav__title" href="gbnf-grammars.html">How I use GBNF grammars to make small local models stop hallucinating JSON</a></span>
        </nav>"""

# 1. drop cdnjs prism stylesheet link (multi-line attributes)
src, n = re.subn(r'\s*<link\b[^>]*?cdnjs[^>]*?/?>', "", src, flags=re.S)
assert n == 1, f"cdnjs link: expected 1, got {n}"

# 2. drop all inline <style> blocks (token colors + table-wrap now in theme.css)
src, n = re.subn(r"\s*<style>.*?</style>", "", src, flags=re.S)
assert n == 1, f"style blocks: expected 1, got {n}"

# 3. skip link after <body>
assert src.count("<body>") == 1
src = src.replace(
    "<body>\n",
    '<body>\n    <a class="skip-link" href="#main">Skip to content</a>\n',
    1,
)

# 4. new header
src, n = re.subn(
    r'<header class="site-header">.*?</header>', NEW_HEADER, src, count=1, flags=re.S
)
assert n == 1

# 5. main id
assert src.count("<main>") == 1
src = src.replace("<main>", '<main id="main">', 1)

# 6. frame figures as windows
def new_figure(m):
    inner = m.group(1)
    idx = inner.find("<figcaption>")
    assert idx > 0
    img = inner[:idx].strip()
    cap = inner[idx : len(inner) - len("</figcaption>")].strip()
    return (
        '<figure class="window blog-post__figure">\n'
        "            <div class=\"window__bar\"><span class=\"window__dots\" aria-hidden=\"true\"><i></i><i></i><i></i></span><span class=\"window__title\">eris</span></div>\n"
        "            <div class=\"window__body\">\n"
        f"              {img}\n"
        "            </div>\n"
        f"            <figcaption>{cap}</figcaption>\n"
        "          </figure>"
    )

src, n = re.subn(
    r'<figure class="blog-post__figure">(.*?)</figure>', new_figure, src, flags=re.S
)
assert n >= 1, "no figures found"

# 7. terminal frames around code blocks
# NOTE: some <pre> openers are Prettier-split across lines:
#   <pre\n    class="code"\n  ><code>...
# so match any <pre ... class="code" ...><code> with DOTALL.
opens = re.findall(r"<pre[^>]*class=\"code\"[^>]*><code>", src)
closes = src.count("</code></pre>")
assert len(opens) == closes, f"unbalanced code tags: {len(opens)} opens vs {closes} closes"

bar = (
    '<div class="terminal__bar">\n'
    "              <span class=\"window__dots\" aria-hidden=\"true\"><i></i><i></i><i></i></span>\n"
    "              <span class=\"terminal__label\">code</span>\n"
    "              <button class=\"terminal__copy\" type=\"button\">copy</button>\n"
    "            </div>\n"
)
src, n = re.subn(
    r"<pre[^>]*class=\"code\"[^>]*><code>",
    lambda m: '<div class="terminal">\n            ' + bar + "            " + m.group(0),
    src,
    flags=re.S,
)
assert n == len(opens)
src = src.replace("</code></pre>\n", "</code></pre>\n            </div>\n")

# 8. post-nav before wrap/article close
marker = "        </div>\n      </article>"
assert src.count(marker) == 1, "post-nav marker not unique"
# keep the wrap's closing div (the marker consumes it)
src = src.replace(marker, POST_NAV + "\n        </div>\n      </article>", 1)

# 9. new footer
src, n = re.subn(
    r'<footer class="site-footer">.*?</footer>', NEW_FOOTER, src, count=1, flags=re.S
)
assert n == 1

# 10. scripts: drop prism CDN + inline detector + CF challenge, add local set
NEW_SCRIPTS = """  <script src="../vendor/prism/prism.min.js"></script>
  <script src="../vendor/prism/prism-rust.min.js"></script>
  <script src="../js/site.js"></script>
</body>"""
src, n = re.subn(
    r'\s*<script src="https://cdnjs.*?</body>', NEW_SCRIPTS, src, count=1, flags=re.S
)
assert n == 1

after_p = src.count("<p")
after_pre = src.count('<pre class="code">')

open(PATH, "w", encoding="utf-8").write(src)
print(f"OK paragraphs {before_p}->{after_p}  pre.code {before_pre}->{after_pre}  terminal {src.count('terminal__copy')}")
for bad in ("cdnjs", "__CF", "<style>", "cdn-cgi"):
    assert bad not in src, f"leftover: {bad}"
print("clean: no cdnjs / CF / style leftovers")

/* Eris site — small vanilla JS, no dependencies.
   details-from-hash, mobile nav, scroll-spy, reveal-on-scroll,
   copy buttons, local Prism highlighting (blog posts only). */
(function () {
  var d = document;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* 1. open <details> from #hash (original site behaviour) */
  function openFromHash() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = d.getElementById(id);
    if (el && el.tagName === "DETAILS") {
      el.open = true;
      el.scrollIntoView({ block: "start" });
    }
  }
  openFromHash();
  window.addEventListener("hashchange", openFromHash);

  /* 2. mobile nav */
  var toggle = d.querySelector(".nav-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var open = d.body.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    d.querySelectorAll(".nav a").forEach(function (a) {
      a.addEventListener("click", function () {
        d.body.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* 3. scroll-spy for landing nav */
  var spyLinks = Array.prototype.slice.call(d.querySelectorAll(".nav a[data-spy]"));
  if (spyLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    spyLinks.forEach(function (a) {
      byId[a.getAttribute("data-spy")] = a;
    });
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          spyLinks.forEach(function (a) {
            a.classList.remove("nav--active");
          });
          var link = byId[e.target.id];
          if (link) link.classList.add("nav--active");
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    Object.keys(byId).forEach(function (id) {
      var el = d.getElementById(id);
      if (el) spy.observe(el);
    });
  }

  /* 4. reveal on scroll (staggered within a parent) */
  var reveals = d.querySelectorAll(".reveal");
  if (reveals.length) {
    if (reduced || !("IntersectionObserver" in window)) {
      reveals.forEach(function (el) {
        el.classList.add("is-in");
      });
    } else {
      var count = {};
      reveals.forEach(function (el) {
        var p = el.parentElement;
        count[p] = (count[p] || 0) + 1;
        el.style.transitionDelay = Math.min(count[p], 6) * 70 + "ms";
      });
      var rio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-in");
              rio.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );
      reveals.forEach(function (el) {
        rio.observe(el);
      });
    }
  }

  /* 5. copy buttons on terminal blocks */
  d.querySelectorAll(".terminal").forEach(function (t) {
    var btn = t.querySelector(".terminal__copy");
    var pre = t.querySelector("pre");
    if (!btn || !pre) return;
    btn.addEventListener("click", function () {
      var label = btn.textContent;
      function done() {
        btn.textContent = "copied";
        btn.classList.add("is-copied");
        setTimeout(function () {
          btn.textContent = label;
          btn.classList.remove("is-copied");
        }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pre.innerText).then(done, done);
      } else {
        var ta = d.createElement("textarea");
        ta.value = pre.innerText;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        d.body.appendChild(ta);
        ta.select();
        try {
          d.execCommand("copy");
        } catch (e) {
          /* noop */
        }
        d.body.removeChild(ta);
        done();
      }
    });
  });

  /* 6. Prism (blog posts only — script is vendored locally) */
  if (window.Prism) {
    d.querySelectorAll("pre.code > code").forEach(function (code) {
      if (code.classList.contains("language-rust") || code.classList.contains("language-markup")) return;
      var text = code.textContent;
      if (/\b(fn |let |pub |struct |const |impl |use |mod |enum |match |if |else |for |while |return |async |await)\b/.test(text)) {
        code.classList.add("language-rust");
      } else {
        code.classList.add("language-markup");
      }
      var term = code.closest(".terminal");
      var label = term && term.querySelector(".terminal__label");
      if (label) label.textContent = code.classList.contains("language-rust") ? "rust" : "code";
    });
    Prism.highlightAll();
  }
})();

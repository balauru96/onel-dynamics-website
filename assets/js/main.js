/* Onel-Dynamics — site behaviour
   Progressive enhancement only. The page is fully readable with JS disabled. */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------------- Footer year */
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------- Sticky header */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------------------------------------------------------------- Mobile nav */
  var toggle = document.getElementById("navToggle");
  var nav = document.getElementById("nav");

  if (toggle && nav) {
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("is-locked", open);
    };

    var isOpen = function () {
      return toggle.getAttribute("aria-expanded") === "true";
    };

    toggle.addEventListener("click", function () {
      setOpen(!isOpen());
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (event) {
      if (isOpen() && !nav.contains(event.target) && !toggle.contains(event.target)) {
        setOpen(false);
      }
    });

    /* Close and return to the toggle when the layout becomes desktop again. */
    var desktop = window.matchMedia("(min-width: 861px)");
    var onBreakpoint = function (event) {
      if (event.matches) setOpen(false);
    };
    if (typeof desktop.addEventListener === "function") {
      desktop.addEventListener("change", onBreakpoint);
    } else if (typeof desktop.addListener === "function") {
      desktop.addListener(onBreakpoint);
    }
  }

  /* ---------------------------------------------------------------- Reveal on scroll */
  var revealables = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add("is-in");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    Array.prototype.forEach.call(revealables, function (el) {
      revealObserver.observe(el);
    });
  }

  /* ---------------------------------------------------------------- Scrollspy */
  var links = Array.prototype.slice.call(
    document.querySelectorAll(".nav__link[href^='#']")
  );
  var targets = links
    .map(function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(Boolean);

  if (targets.length && "IntersectionObserver" in window) {
    var visible = new Map();

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        });

        var bestId = null;
        var bestRatio = 0;
        visible.forEach(function (ratio, id) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        links.forEach(function (link) {
          var isActive = link.getAttribute("href") === "#" + bestId;
          if (isActive) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    targets.forEach(function (section) {
      spy.observe(section);
    });
  }
})();

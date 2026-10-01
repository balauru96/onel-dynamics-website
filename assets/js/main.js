/* Onel-Dynamics — site behaviour
   Progressive enhancement only. The page is fully readable with JS disabled. */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------------- Opening transition */
  var motionToggle = document.getElementById("motionToggle");
  var aircraft = document.querySelector(".drone-scene__aircraft");
  var hero = document.getElementById("about");
  var stage = document.querySelector(".drone-scene__viewport");
  var heroCopy = document.querySelector(".hero__copy");
  if (motionToggle && aircraft && hero && stage) {
    var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finished = true;
    var started = false;
    function settle() {
      root.classList.remove("intro-ready", "intro-copy-ready", "intro-paused");
      finished = true;
      motionToggle.textContent = started ? "Replay animation" : "Play animation";
      motionToggle.setAttribute("aria-pressed", "false");
    }
    function play() {
      if (document.hidden || motionPreference.matches || !aircraft.naturalWidth) return;
      settle();
      hero.offsetWidth; // Restart the sequence only on opening or explicit replay.
      root.classList.add("intro-ready");
      if (heroCopy) {
        var copyBounds = heroCopy.getBoundingClientRect();
        if (copyBounds.top < window.innerHeight && copyBounds.bottom > 0) {
          root.classList.add("intro-copy-ready");
        }
      }
      started = true;
      finished = false;
      motionToggle.textContent = "Pause animation";
    }
    function syncMotion() {
      motionToggle.hidden = motionPreference.matches || !aircraft.naturalWidth;
      if (motionPreference.matches) settle();
      else if (finished) motionToggle.textContent = started ? "Replay animation" : "Play animation";
    }
    function startWhenReady() {
      syncMotion();
      if (started || document.hidden || motionPreference.matches || !aircraft.naturalWidth) return;
      var bounds = stage.getBoundingClientRect();
      var visibleHeight = Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0);
      if (visibleHeight >= Math.min(bounds.height * 0.2, 80)) play();
    }
    aircraft.addEventListener("animationend", function (event) {
      if (event.animationName !== "drone-arrival") return;
      settle();
    });
    aircraft.addEventListener("load", startWhenReady, { once: true });
    aircraft.addEventListener("error", function () { settle(); motionToggle.hidden = true; }, { once: true });
    motionToggle.addEventListener("click", function () {
      if (motionPreference.matches) return;
      if (finished) play();
      else {
        var paused = root.classList.toggle("intro-paused");
        motionToggle.setAttribute("aria-pressed", paused ? "true" : "false");
        motionToggle.textContent = paused ? "Resume animation" : "Pause animation";
      }
    });
    syncMotion();
    if (aircraft.complete) startWhenReady();
    if (motionPreference.addEventListener) motionPreference.addEventListener("change", startWhenReady);
    else if (motionPreference.addListener) motionPreference.addListener(startWhenReady);
    document.addEventListener("visibilitychange", startWhenReady);
    var entranceQueued = false;
    function queueEntrance() {
      if (started || entranceQueued) return;
      entranceQueued = true;
      window.requestAnimationFrame(function () { entranceQueued = false; startWhenReady(); });
    }
    window.addEventListener("scroll", queueEntrance, { passive: true });
    window.addEventListener("resize", queueEntrance);
    window.addEventListener("pageshow", function (event) {
      if (event.persisted) { started = true; settle(); }
    });
  }

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
    var desktop = window.matchMedia("(min-width: 1281px)");
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

  if (targets.length) {
    var updateCurrent = function () {
      var current = targets[0];
      var marker = Math.max(header ? header.getBoundingClientRect().bottom : 0,
        window.innerHeight * 0.3);
      targets.forEach(function (section) {
        if (section.getBoundingClientRect().top <= marker) current = section;
      });
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 2) {
        current = targets[targets.length - 1];
      }
      links.forEach(function (link) {
        if (link.getAttribute("href") === "#" + current.id) {
          link.setAttribute("aria-current", "true");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    };
    var scheduled = false;
    var scheduleCurrent = function () {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        updateCurrent();
      });
    };
    updateCurrent();
    window.addEventListener("scroll", scheduleCurrent, { passive: true });
    window.addEventListener("resize", scheduleCurrent);
    window.addEventListener("load", scheduleCurrent);
    document.addEventListener("toggle", scheduleCurrent, true);
  }
})();

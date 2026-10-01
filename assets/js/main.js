/* Onel-Dynamics — site behaviour
   Progressive enhancement only. The page is fully readable with JS disabled. */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------------------------------------------------------------- Drone concept */
  var motionToggle = document.getElementById("motionToggle");
  var aircraft = document.querySelector(".drone-scene__aircraft");
  if (motionToggle && aircraft) {
    var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    var finished = false;
    var syncMotion = function () {
      motionToggle.hidden = motionPreference.matches;
      if (motionPreference.matches) {
        aircraft.style.animation = "none";
        aircraft.style.animationPlayState = "running";
        motionToggle.setAttribute("aria-pressed", "false");
        finished = true;
      } else {
        motionToggle.textContent = finished ? "Replay animation" : "Pause animation";
      }
    };
    aircraft.addEventListener("animationend", function () {
      finished = true;
      motionToggle.textContent = "Replay animation";
      motionToggle.setAttribute("aria-pressed", "false");
    });
    motionToggle.addEventListener("click", function () {
      if (motionPreference.matches) return;
      if (finished) {
        aircraft.style.animation = "none";
        aircraft.offsetWidth; // Restart only after an explicit replay request.
        aircraft.style.animation = "";
        aircraft.style.animationPlayState = "running";
        finished = false;
        motionToggle.textContent = "Pause animation";
        motionToggle.setAttribute("aria-pressed", "false");
      } else {
        var paused = motionToggle.getAttribute("aria-pressed") !== "true";
        aircraft.style.animationPlayState = paused ? "paused" : "running";
        motionToggle.setAttribute("aria-pressed", paused ? "true" : "false");
        motionToggle.textContent = paused ? "Resume animation" : "Pause animation";
      }
    });
    syncMotion();
    if (motionPreference.addEventListener) motionPreference.addEventListener("change", syncMotion);
    else if (motionPreference.addListener) motionPreference.addListener(syncMotion);
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

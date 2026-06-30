/* ============================================================
   app.js — Heart & Soul easy-read explainer

   Plain vanilla JS, no build step. One screen shown at a time.
   - picker -> step-by-step explainer -> consent -> end
   - read-aloud (SpeechSynthesis), per step and whole card
   - 3-2-1 countdown (only runs when she taps it)
   - "Download my card" => print-to-PDF (selectable text)
   No timers auto-advance anything. She is always in control.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- tiny helpers ---------- */
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- app state ---------- */
  var state = {
    procedure: null,   // current procedure object
    index: 0,          // current step index
    consent: null      // her chosen consent answer (string)
  };

  /* ---------- screen switching + focus management ---------- */
  function showScreen(id) {
    stopSpeaking();
    $$(".screen").forEach(function (s) {
      var on = s.id === id;
      s.hidden = !on;
      s.classList.toggle("is-active", on);
    });
    var el = document.getElementById(id);
    if (el) {
      // move keyboard + screen-reader focus to the new screen's heading
      var focusTarget = el.querySelector("[tabindex='-1']") || el;
      window.requestAnimationFrame(function () {
        focusTarget.focus({ preventScroll: false });
        window.scrollTo({ top: 0, behavior: "auto" });
      });
    }
  }

  /* ---------- render one step ---------- */
  function renderStep() {
    var steps = state.procedure.steps;
    var step = steps[state.index];
    var total = steps.length;
    var num = state.index + 1;

    $("#step-current").textContent = num;
    $("#step-total").textContent = total;

    // progress dots
    var dots = "";
    for (var i = 0; i < total; i++) {
      var cls = i < state.index ? "is-done" : (i === state.index ? "is-now" : "");
      dots += '<span class="progress__dot ' + cls + '"></span>';
    }
    $("#progress").innerHTML = dots;

    // symbol
    $("#step-icon").textContent = step.icon || "info";

    // sentence (with an optional plain inline gloss for a hard word)
    $("#step-sentence").innerHTML = sentenceHTML(step);

    // why
    $("#step-why-text").textContent = step.why || "";

    // consent choices
    var choices = $("#step-choices");
    if (step.type === "consent" && step.choices) {
      choices.innerHTML = '<legend class="visually-hidden">Choose one</legend>' +
        step.choices.map(function (c, idx) {
          var checked = (state.consent === c.value) || (state.consent === null && idx === 0) ? "checked" : "";
          return '' +
            '<label class="choice">' +
              '<input type="radio" name="consent-site" value="' + esc(c.value) + '" ' + checked + ' />' +
              '<span class="choice__body">' +
                '<span class="symbol choice__icon" aria-hidden="true">' + esc(c.icon || "radio_button_unchecked") + '</span>' +
                '<span class="choice__text">' + esc(capitalise(c.value)) + '</span>' +
                '<span class="symbol choice__tick" aria-hidden="true">check</span>' +
              '</span>' +
            '</label>';
        }).join("");
      choices.hidden = false;
      // remember the selection as she changes it
      $$("#step-choices input").forEach(function (input) {
        input.addEventListener("change", function () { state.consent = input.value; });
      });
      // make sure state has the default
      if (state.consent === null) state.consent = step.choices[0].value;
    } else {
      choices.hidden = true;
      choices.innerHTML = "";
    }

    // soothe (countdown) button
    var countdown = $("#countdown-btn");
    countdown.hidden = !step.soothe;
    $("#countdown-status").textContent = "";

    // next button label
    $("#next-label").textContent = (state.index === total - 1) ? "I'm ready" : "Next";

    showScreen("screen-step");
  }

  function sentenceHTML(step) {
    var text = step.text || "";
    if (step.term && step.term.word && text.indexOf(step.term.word) !== -1) {
      var safe = esc(text);
      var word = esc(step.term.word);
      var gloss = esc(step.term.gloss || "");
      var glossed = '<span class="term">' + word +
        '<span class="term__gloss"> (' + gloss + ')</span></span>';
      return safe.replace(word, glossed);
    }
    return esc(text);
  }

  function capitalise(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  /* ---------- navigation ---------- */
  function startProcedure(id) {
    var proc = window.PROCEDURES[id];
    if (!proc) return;
    state.procedure = proc;
    state.index = 0;
    state.consent = null;
    renderStep();
  }

  function next() {
    if (state.index < state.procedure.steps.length - 1) {
      state.index++;
      renderStep();
    } else {
      goToEnd();
    }
  }

  function back() {
    if (state.index > 0) {
      state.index--;
      renderStep();
    } else {
      showScreen("screen-picker");
    }
  }

  /* ---------- end screen + card ---------- */
  function goToEnd() {
    var preview = $("#card-preview");
    if (state.consent) {
      $("#card-preview-text").innerHTML =
        "You chose: blood taken from <strong>" + esc(state.consent) + "</strong>.";
      preview.hidden = false;
    } else {
      preview.hidden = true;
    }
    buildPrintCard();
    showScreen("screen-end");
  }

  /* ---------- read-aloud (SpeechSynthesis) ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    stopSpeaking();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;      // calm, unhurried
    u.pitch = 1;
    u.lang = "en-GB";
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }
  function stepReadAloudText() {
    var step = state.procedure.steps[state.index];
    var parts = [step.text];
    if (step.term) parts.push(step.term.word + " means " + step.term.gloss + ".");
    if (step.why) parts.push(step.why);
    if (step.type === "consent") parts.push("You chose " + (state.consent || step.choices[0].value) + ".");
    return parts.join(" ");
  }
  function wholeReadAloudText() {
    var proc = state.procedure;
    var parts = [proc.title + ". Here is what happens, step by step."];
    proc.steps.forEach(function (step, i) {
      parts.push("Step " + (i + 1) + ". " + step.text);
      if (step.why) parts.push(step.why);
    });
    if (state.consent) parts.push("You chose blood taken from " + state.consent + ".");
    parts.push("That's the whole visit. You've got this.");
    return parts.join(" ");
  }

  /* ---------- 3-2-1 countdown (only on tap) ---------- */
  var countdownTimers = [];
  function runCountdown() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
    var status = $("#countdown-status");
    var seq = ["3", "2", "1", "You can do this."];
    seq.forEach(function (label, i) {
      countdownTimers.push(setTimeout(function () {
        status.textContent = label;
        if (i < 3) speak(label);
      }, i * 1000));
    });
  }

  /* ---------- build the printable one-page card ---------- */
  function buildPrintCard() {
    var proc = state.procedure;
    var card = $("#print-card");
    var rows = proc.steps.map(function (step, i) {
      var glossLine = step.term
        ? '<span class="pc-gloss">' + esc(step.term.word) + ": " + esc(step.term.gloss) + '</span>'
        : "";
      return '' +
        '<li class="pc-step">' +
          '<span class="symbol pc-step__icon" aria-hidden="true">' + esc(step.icon || "info") + '</span>' +
          '<div class="pc-step__body">' +
            '<p class="pc-step__sentence"><span class="pc-num">' + (i + 1) + '.</span> ' + esc(step.text) + '</p>' +
            (step.why ? '<p class="pc-step__why">' + esc(step.why) + '</p>' : "") +
            glossLine +
          '</div>' +
        '</li>';
    }).join("");

    var consentBlock = state.consent
      ? '<div class="pc-consent">' +
          '<span class="symbol" aria-hidden="true">verified</span>' +
          '<span>My choice: blood taken from <strong>' + esc(state.consent) + '</strong>.</span>' +
        '</div>'
      : "";

    card.innerHTML = '' +
      '<div class="pc-head">' +
        '<span class="symbol pc-head__mark" aria-hidden="true">favorite</span>' +
        '<div>' +
          '<p class="pc-kicker">My appointment card</p>' +
          '<h1 class="pc-title">' + esc(proc.title) + '</h1>' +
        '</div>' +
      '</div>' +
      consentBlock +
      '<ol class="pc-steps">' + rows + '</ol>' +
      '<p class="pc-foot">Please go slowly and respect my choice above. ' +
        'I calm myself with a 3, 2, 1 countdown. Thank you.</p>';
  }

  /* ---------- "paste my own words" ---------- */
  function buildCustomProcedure(raw) {
    var clean = (raw || "").replace(/\s+/g, " ").trim();
    var sentences = clean.split(/(?<=[.!?])\s+/).filter(function (s) { return s.trim().length; });
    if (!sentences.length) sentences = [clean].filter(Boolean);
    var icons = ["article", "schedule", "checklist", "info", "place", "call"];
    var steps = sentences.slice(0, 8).map(function (s, i) {
      return { icon: icons[i % icons.length], text: s.trim(), why: "" };
    });
    if (!steps.length) return null;
    return { id: "custom", title: "My appointment", icon: "edit_note", steps: steps };
  }

  /* ============================================================
     WIRE UP EVENTS
     ============================================================ */
  function init() {
    // welcome -> picker
    $("#start-btn").addEventListener("click", function () { showScreen("screen-picker"); });

    // picker cards
    $$(".card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-procedure");
        if (id === "custom") {
          showScreen("screen-custom");
        } else {
          startProcedure(id);
        }
      });
    });

    // custom screen
    $("#custom-back-btn").addEventListener("click", function () { showScreen("screen-picker"); });
    $("#custom-go-btn").addEventListener("click", function () {
      var proc = buildCustomProcedure($("#custom-input").value);
      if (!proc) { $("#custom-input").focus(); return; }
      window.PROCEDURES.custom = proc;
      state.procedure = proc; state.index = 0; state.consent = null;
      renderStep();
    });

    // step navigation
    $("#next-btn").addEventListener("click", next);
    $("#back-btn").addEventListener("click", back);

    // countdown + read aloud
    $("#countdown-btn").addEventListener("click", runCountdown);
    $("#listen-step-btn").addEventListener("click", function () { speak(stepReadAloudText()); });

    // end screen
    $("#read-all-btn").addEventListener("click", function () { speak(wholeReadAloudText()); });
    $("#download-btn").addEventListener("click", function () {
      buildPrintCard();
      stopSpeaking();
      window.print();
    });
    $("#restart-btn").addEventListener("click", function () {
      state = { procedure: null, index: 0, consent: null };
      showScreen("screen-welcome");
    });

    // stop any speech if the page is hidden/closed
    window.addEventListener("beforeunload", stopSpeaking);

    // Print-preview hook: ?card=blood-test[&site=my%20right%20arm] pre-builds
    // the printable card so it can be saved/verified as a one-page PDF.
    var params = new URLSearchParams(location.search);
    var demo = params.get("card");
    if (demo && window.PROCEDURES[demo]) {
      state.procedure = window.PROCEDURES[demo];
      state.consent = params.get("site") || "my right arm";
      buildPrintCard();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

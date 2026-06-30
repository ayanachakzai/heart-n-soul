/* ============================================================
   app.js — Heart & Soul easy-read explainer
   Vanilla JS, no build step. One screen at a time.

   Flow: welcome -> name -> picker -> steps (+consent) -> end
   - personalised by name, conversational tone
   - read-aloud (SpeechSynthesis), per step and whole card
   - 3-2-1 countdown ONLY on the needle step (a shared cue)
   - card has two parts: my preferences, and a note to the staff
   - download as PDF (selectable text), Picture (JPG), or Rich text
   No timers auto-advance anything. She is always in control.
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  var state = { procedure: null, index: 0, consent: null, name: "" };

  /* ---------- screen switching + focus ---------- */
  function showScreen(id) {
    stopSpeaking();
    $$(".screen").forEach(function (s) {
      var on = s.id === id;
      s.hidden = !on;
      s.classList.toggle("is-active", on);
    });
    var el = document.getElementById(id);
    if (el) {
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

    $("#step-current").textContent = state.index + 1;
    $("#step-total").textContent = total;

    var dots = "";
    for (var i = 0; i < total; i++) {
      var cls = i < state.index ? "is-done" : (i === state.index ? "is-now" : "");
      dots += '<span class="progress__dot ' + cls + '"></span>';
    }
    $("#progress").innerHTML = dots;

    $("#step-icon").textContent = step.icon || "info";
    $("#step-sentence").innerHTML = sentenceHTML(step);
    $("#step-why-text").textContent = step.why || "";

    // "Good to know" note (e.g. the wipe feels cold/itchy)
    var note = $("#step-note");
    if (step.note) { $("#step-note-text").textContent = step.note; note.hidden = false; }
    else { note.hidden = true; $("#step-note-text").textContent = ""; }

    // consent choices
    var choices = $("#step-choices");
    if (step.type === "consent" && step.choices) {
      choices.innerHTML = '<legend class="visually-hidden">Choose one</legend>' +
        step.choices.map(function (c, idx) {
          var checked = (state.consent === c.value) || (state.consent === null && idx === 0) ? "checked" : "";
          return '<label class="choice">' +
            '<input type="radio" name="consent-site" value="' + esc(c.value) + '" ' + checked + ' />' +
            '<span class="choice__body">' +
              '<span class="symbol choice__icon" aria-hidden="true">' + esc(c.icon || "radio_button_unchecked") + '</span>' +
              '<span class="choice__text">' + esc(cap(c.value)) + '</span>' +
              '<span class="symbol choice__tick" aria-hidden="true">check</span>' +
            '</span></label>';
        }).join("");
      choices.hidden = false;
      $$("#step-choices input").forEach(function (input) {
        input.addEventListener("change", function () { state.consent = input.value; });
      });
      if (state.consent === null) state.consent = step.choices[0].value;
    } else {
      choices.hidden = true;
      choices.innerHTML = "";
    }

    // soothe / countdown — ONLY where the step asks for it (needle)
    $("#soothe").hidden = !step.soothe;
    $("#countdown-status").textContent = "";

    $("#next-label").textContent = (state.index === total - 1) ? "I'm ready" : "Next";
    showScreen("screen-step");
  }

  function sentenceHTML(step) {
    var text = step.text || "";
    if (step.term && step.term.word && text.indexOf(step.term.word) !== -1) {
      var word = esc(step.term.word);
      var glossed = '<span class="term">' + word +
        '<span class="term__gloss"> (' + esc(step.term.gloss || "") + ')</span></span>';
      return esc(text).replace(word, glossed);
    }
    return esc(text);
  }

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
    if (state.index < state.procedure.steps.length - 1) { state.index++; renderStep(); }
    else { goToEnd(); }
  }
  function back() {
    if (state.index > 0) { state.index--; renderStep(); }
    else { showScreen("screen-picker"); }
  }

  /* ---------- personalisation ---------- */
  function greet(base) { return state.name ? base.replace("{name}", state.name) : base.replace(", {name}", "").replace("{name}", "you"); }

  function goToPicker() {
    var title = state.name ? "Thanks, " + state.name + ". What is your appointment for?"
                           : "What is your appointment for?";
    $("#picker-title").textContent = title;
    showScreen("screen-picker");
  }

  /* ---------- end + preview ---------- */
  function goToEnd() {
    $("#end-title").textContent = state.name
      ? "That's the whole visit, " + state.name + ". You've got this."
      : "That's the whole visit. You've got this.";

    var preview = $("#card-preview");
    if (state.consent && state.procedure.kind === "blood") {
      $("#card-preview-text").innerHTML =
        "Your card asks staff to take blood from <strong>" + esc(state.consent) + "</strong>.";
      preview.hidden = false;
    } else { preview.hidden = true; }

    $("#downloads-status").textContent = "";
    buildPrintCard();
    showScreen("screen-end");
  }

  /* ---------- read-aloud ---------- */
  function speak(text) {
    if (!("speechSynthesis" in window)) return;
    stopSpeaking();
    var u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; u.pitch = 1; u.lang = "en-GB";
    window.speechSynthesis.speak(u);
  }
  function stopSpeaking() { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); }

  function stepReadAloudText() {
    var step = state.procedure.steps[state.index];
    var parts = [step.text];
    if (step.note) parts.push(step.note);
    if (step.term) parts.push(step.term.word + " means " + step.term.gloss + ".");
    if (step.why) parts.push(step.why);
    if (step.type === "consent") parts.push("You chose " + (state.consent || step.choices[0].value) + ".");
    return parts.join(" ");
  }
  function wholeReadAloudText() {
    var proc = state.procedure;
    var hi = state.name ? "Hello " + state.name + ". " : "";
    var parts = [hi + proc.title + ". Here is what happens, step by step."];
    proc.steps.forEach(function (step, i) {
      parts.push("Step " + (i + 1) + ". " + step.text);
      if (step.note) parts.push(step.note);
      if (step.why) parts.push(step.why);
    });
    staffLines().forEach(function (l) { parts.push(l); });
    parts.push("That's the whole visit. You've got this.");
    return parts.join(" ");
  }

  /* ---------- countdown (only on tap) ---------- */
  var countdownTimers = [];
  function runCountdown() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
    var status = $("#countdown-status");
    ["3", "2", "1", "You can do this."].forEach(function (label, i) {
      countdownTimers.push(setTimeout(function () {
        status.textContent = label;
        if (i < 3) speak(label);
      }, i * 1000));
    });
  }

  /* ---------- the card model (shared by all outputs) ---------- */
  function staffLines() {
    var proc = state.procedure;
    var lines = [];
    var hasConsent = proc.steps.some(function (s) { return s.type === "consent"; });
    if (hasConsent && state.consent) {
      var tmpl = "Please take my blood from {choice}.";
      proc.steps.forEach(function (s) { if (s.type === "consent" && s.staff) tmpl = s.staff; });
      lines.push(tmpl.replace("{choice}", state.consent));
    }
    if (proc.steps.some(function (s) { return s.soothe; })) {
      lines.push("I calm myself by counting down 3, 2, 1. Please count down with me first.");
    }
    lines.push("Please tell me what you are going to do before you do it, in simple words.");
    return lines;
  }

  /* ---------- printable / capturable card (HTML, sectioned) ---------- */
  function buildPrintCard() {
    var proc = state.procedure;
    var card = $("#print-card");

    var aboutLines = [];
    if (state.name) aboutLines.push("My name is <strong>" + esc(state.name) + "</strong>.");
    aboutLines.push("Please check my name, my date of birth, and my address.");
    var about = '<div class="pc-section"><p class="pc-h">About me</p>' +
      aboutLines.map(function (l) { return '<p class="pc-line">' + l + '</p>'; }).join("") + '</div>';

    var staff = '<div class="pc-section pc-section--staff"><p class="pc-h">' +
      '<span class="symbol" aria-hidden="true">volunteer_activism</span> For the person doing my test</p>' +
      staffLines().map(function (l) { return '<p class="pc-line">' + esc(l) + '</p>'; }).join("") + '</div>';

    var rows = proc.steps.map(function (step, i) {
      var noteLine = step.note ? '<p class="pc-step__note">' + esc(step.note) + '</p>' : "";
      var glossLine = step.term ? '<p class="pc-gloss">' + esc(step.term.word) + ": " + esc(step.term.gloss) + '</p>' : "";
      return '<li class="pc-step">' +
        '<span class="symbol pc-step__icon" aria-hidden="true">' + esc(step.icon || "info") + '</span>' +
        '<div class="pc-step__body">' +
          '<p class="pc-step__sentence"><span class="pc-num">' + (i + 1) + '.</span> ' + esc(step.text) + '</p>' +
          (step.why ? '<p class="pc-step__why">' + esc(step.why) + '</p>' : "") +
          noteLine + glossLine +
        '</div></li>';
    }).join("");

    card.innerHTML =
      '<div class="pc-head">' +
        '<span class="symbol pc-head__mark" aria-hidden="true">favorite</span>' +
        '<div><p class="pc-kicker">My appointment card</p><h1 class="pc-title">' + esc(proc.title) + '</h1></div>' +
      '</div>' +
      about + staff +
      '<div class="pc-section"><p class="pc-h">What will happen</p><ol class="pc-steps">' + rows + '</ol></div>' +
      '<p class="pc-foot">Thank you for going at my pace and respecting my choices.</p>';
  }

  /* ---------- download: helpers ---------- */
  function triggerBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function status(msg) { $("#downloads-status").textContent = msg; }
  function fileBase() {
    var who = state.name ? "-" + state.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") : "";
    return "my-appointment-card" + who;
  }

  /* ---------- download: PDF (selectable text) ---------- */
  function buildPDF() {
      var jsPDF = window.jspdf && window.jspdf.jsPDF;
      if (!jsPDF) throw new Error("jsPDF not loaded");
      var doc = new jsPDF({ unit: "pt", format: "a4" });
      var proc = state.procedure;
      var M = 48, W = doc.internal.pageSize.getWidth(), maxW = W - M * 2, y = M;

      function page() { if (y > doc.internal.pageSize.getHeight() - M) { doc.addPage(); y = M; } }
      function heading(t) {
        y += 6; page();
        doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(44, 106, 94);
        doc.text(t, M, y); y += 6;
        doc.setDrawColor(44, 106, 94); doc.setLineWidth(1); doc.line(M, y, W - M, y); y += 14;
      }
      function para(t, opts) {
        opts = opts || {};
        doc.setFont("helvetica", opts.bold ? "bold" : "normal");
        doc.setFontSize(opts.size || 11.5);
        doc.setTextColor(opts.color || "#1c1c1c");
        var lines = doc.splitTextToSize(t, opts.width || maxW);
        lines.forEach(function (ln) {
          page();
          doc.text(ln, opts.x || M, y);
          y += (opts.size || 11.5) * 1.35;
        });
      }

      // title
      doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(28, 28, 28);
      doc.text("My appointment card", M, y); y += 22;
      doc.setFont("helvetica", "normal"); doc.setFontSize(14); doc.setTextColor(44, 106, 94);
      doc.text(proc.title, M, y); y += 10;
      doc.setDrawColor(44, 106, 94); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); y += 22;

      heading("About me");
      if (state.name) para("My name is " + state.name + ".", { bold: true });
      para("Please check my name, my date of birth, and my address.");

      heading("For the person doing my test");
      staffLines().forEach(function (l) { para("•  " + l); });

      heading("What will happen");
      proc.steps.forEach(function (step, i) {
        para((i + 1) + ".  " + step.text, { bold: true });
        if (step.why) para(step.why, { x: M + 14, width: maxW - 14, color: "#444" });
        if (step.note) para("Good to know: " + step.note, { x: M + 14, width: maxW - 14, color: "#6f5a2a" });
        if (step.term) para(step.term.word + ": " + step.term.gloss, { x: M + 14, width: maxW - 14, color: "#6f5a2a" });
        y += 4;
      });

      y += 8; para("Thank you for going at my pace and respecting my choices.", { color: "#333" });
      return doc;
  }
  function downloadPDF() {
    try { buildPDF().save(fileBase() + ".pdf"); status("Saved your card as a PDF."); }
    catch (e) { status("Sorry, could not make the PDF."); }
  }

  /* ---------- download: Picture (JPG) ---------- */
  function downloadJPG() {
    if (!window.html2canvas) { status("Sorry, the picture tool did not load."); return; }
    var node = $("#print-card");
    node.classList.add("is-capturing");
    status("Making your picture…");
    document.fonts.ready.then(function () {
      return window.html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    }).then(function (canvas) {
      node.classList.remove("is-capturing");
      canvas.toBlob(function (blob) {
        if (!blob) { status("Sorry, could not make the picture."); return; }
        triggerBlob(blob, fileBase() + ".jpg");
        status("Saved your card as a picture.");
      }, "image/jpeg", 0.95);
    }).catch(function () {
      node.classList.remove("is-capturing");
      status("Sorry, could not make the picture.");
    });
  }

  /* ---------- download: Rich text (RTF) ---------- */
  function rtfEsc(s) {
    return String(s).replace(/[\\{}]/g, function (c) { return "\\" + c; })
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/—/g, "-").replace(/[^\x00-\x7F]/g, "");
  }
  function buildRTFString() {
    var proc = state.procedure;
    var out = "{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Verdana;}}\\fs28 ";
    function h(t) { out += "\\par\\sb180\\b\\fs30 " + rtfEsc(t) + "\\b0\\fs24\\par "; }
    function p(t, bold) { out += (bold ? "\\b " : "") + rtfEsc(t) + (bold ? "\\b0" : "") + "\\par "; }

    out += "\\b\\fs44 My appointment card\\b0\\fs24\\par ";
    out += "\\fs28 " + rtfEsc(proc.title) + "\\par ";

    h("About me");
    if (state.name) p("My name is " + state.name + ".", true);
    p("Please check my name, my date of birth, and my address.");

    h("For the person doing my test");
    staffLines().forEach(function (l) { p("-  " + l); });

    h("What will happen");
    proc.steps.forEach(function (step, i) {
      p((i + 1) + ".  " + step.text, true);
      if (step.why) p("    " + step.why);
      if (step.note) p("    Good to know: " + step.note);
      if (step.term) p("    " + step.term.word + ": " + step.term.gloss);
    });

    out += "\\par " + rtfEsc("Thank you for going at my pace and respecting my choices.") + "\\par }";
    return out;
  }
  function downloadRTF() {
    triggerBlob(new Blob([buildRTFString()], { type: "application/rtf" }), fileBase() + ".rtf");
    status("Saved your card as rich text.");
  }

  /* ---------- paste my own words: examples + upload ---------- */
  var EXAMPLES = {
    blood: "You have an appointment for a blood test on Tuesday. Please come ten minutes early. You do not need to stop eating or drinking. The test takes about five minutes. Please bring your appointment letter.",
    xray: "You have an appointment for an X-ray of your chest. Please wear loose clothes with no metal. You may be asked to change into a gown. The X-ray is quick and does not hurt.",
    preop: "You have a pre-op assessment before your operation. A nurse will check your health. They will measure your blood pressure and take some blood. Please bring a list of your medicines."
  };
  function buildCustomProcedure(raw) {
    var clean = (raw || "").replace(/\s+/g, " ").trim();
    if (!clean) return null;
    var sentences = clean.split(/(?<=[.!?])\s+/).filter(function (s) { return s.trim().length; });
    if (!sentences.length) sentences = [clean];
    var icons = ["article", "schedule", "checklist", "info", "place", "directions_walk", "call", "done"];
    var steps = sentences.slice(0, 10).map(function (s, i) {
      return { icon: icons[i % icons.length], text: s.trim().replace(/\s+/g, " "), why: "" };
    });
    return { id: "custom", title: "My appointment", icon: "edit_note", kind: "other", steps: steps };
  }

  /* ============================================================ */
  function init() {
    // welcome -> name
    $("#start-btn").addEventListener("click", function () { showScreen("screen-name"); });

    // name -> picker
    $("#name-continue-btn").addEventListener("click", function () {
      state.name = ($("#name-input").value || "").trim().replace(/\s+/g, " ").slice(0, 40);
      goToPicker();
    });
    $("#name-skip-btn").addEventListener("click", function () { state.name = ""; goToPicker(); });
    $("#name-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); $("#name-continue-btn").click(); }
    });

    // picker
    $$(".card").forEach(function (card) {
      card.addEventListener("click", function () {
        var id = card.getAttribute("data-procedure");
        if (id === "custom") showScreen("screen-custom");
        else startProcedure(id);
      });
    });

    // custom: examples
    $$("#examples .chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var key = chip.getAttribute("data-example");
        $("#custom-input").value = EXAMPLES[key] || "";
        $("#custom-input").focus();
      });
    });
    // custom: upload
    $("#custom-file").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      $("#custom-file-name").textContent = "Reading " + file.name + "…";
      var reader = new FileReader();
      reader.onload = function () {
        $("#custom-input").value = String(reader.result || "").slice(0, 4000);
        $("#custom-file-name").textContent = file.name + " added below.";
        $("#custom-input").focus();
      };
      reader.onerror = function () { $("#custom-file-name").textContent = "Sorry, could not read that file."; };
      reader.readAsText(file);
    });
    $("#custom-back-btn").addEventListener("click", function () { showScreen("screen-picker"); });
    $("#custom-go-btn").addEventListener("click", function () {
      var proc = buildCustomProcedure($("#custom-input").value);
      if (!proc) { $("#custom-input").focus(); return; }
      window.PROCEDURES.custom = proc;
      state.procedure = proc; state.index = 0; state.consent = null;
      renderStep();
    });

    // step nav
    $("#next-btn").addEventListener("click", next);
    $("#back-btn").addEventListener("click", back);
    $("#countdown-btn").addEventListener("click", runCountdown);
    $("#listen-step-btn").addEventListener("click", function () { speak(stepReadAloudText()); });

    // end
    $("#read-all-btn").addEventListener("click", function () { speak(wholeReadAloudText()); });
    $("#dl-pdf").addEventListener("click", downloadPDF);
    $("#dl-jpg").addEventListener("click", downloadJPG);
    $("#dl-rtf").addEventListener("click", downloadRTF);
    $("#restart-btn").addEventListener("click", function () {
      state = { procedure: null, index: 0, consent: null, name: "" };
      $("#name-input").value = "";
      showScreen("screen-welcome");
    });

    window.addEventListener("beforeunload", stopSpeaking);

    // print-preview hook for verification: ?card=blood-test&name=Robyn
    var params = new URLSearchParams(location.search);
    var demo = params.get("card");
    if (demo && window.PROCEDURES[demo]) {
      state.procedure = window.PROCEDURES[demo];
      state.consent = params.get("site") || "my right arm";
      state.name = params.get("name") || "";
      buildPrintCard();
      window.__hs = { buildPDF: buildPDF, buildRTFString: buildRTFString, buildPrintCard: buildPrintCard, state: state };
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

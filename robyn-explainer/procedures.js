/* ============================================================
   procedures.js — seeded, easy-read procedures
   Exposed as a plain global so the app works even when the page
   is opened straight from a file (no build step, no modules).

   Each step is ONE short sentence, ONE message, with a clean
   symbol and a plain "why". Hard words carry a plain inline gloss.
   A consent step has `choices`; a step that may feel scary can
   set `soothe: true` to offer the 3-2-1 countdown.
   ============================================================ */
window.PROCEDURES = {

  "blood-test": {
    id: "blood-test",
    title: "Blood test",
    icon: "bloodtype",
    steps: [
      {
        icon: "event_seat",
        text: "You sit down in a comfy chair.",
        why: "A comfy chair helps you feel calm and steady."
      },
      {
        icon: "badge",
        text: "A nurse says hello and checks your name.",
        why: "We check your name so you get the right care."
      },
      {
        icon: "sanitizer",
        text: "The nurse cleans a small spot on your skin.",
        why: "Cleaning keeps germs away so you stay safe.",
        term: { word: "germs", gloss: "tiny bugs that can make you poorly" }
      },
      {
        type: "consent",
        icon: "front_hand",
        text: "Where would you like your blood taken from?",
        why: "We will write it down. Staff will follow what you choose.",
        choices: [
          { value: "my left arm", icon: "back_hand" },
          { value: "my right arm", icon: "front_hand" },
          { value: "the back of my hand", icon: "pan_tool" }
        ]
      },
      {
        icon: "vaccines",
        text: "A small needle takes a little blood.",
        why: "We take a little blood to check how your body is doing.",
        term: { word: "needle", gloss: "a thin, hollow pin" },
        soothe: true
      },
      {
        icon: "healing",
        text: "All done. A soft plaster goes on.",
        why: "The plaster keeps the spot clean while it heals."
      }
    ]
  },

  "blood-pressure": {
    id: "blood-pressure",
    title: "Blood pressure check",
    icon: "monitor_heart",
    steps: [
      {
        icon: "event_seat",
        text: "You sit down and rest your arm on the table.",
        why: "Resting your arm helps us get a good reading."
      },
      {
        icon: "cardiology",
        text: "A soft band wraps around your arm.",
        why: "The band needs to be snug to do its job.",
        term: { word: "snug", gloss: "close and a little tight" }
      },
      {
        icon: "compress",
        text: "The band squeezes for a few seconds, then lets go.",
        why: "The squeeze measures how your blood is flowing.",
        soothe: true
      },
      {
        icon: "check_circle",
        text: "All done. The band comes off.",
        why: "We write down the number to check your health."
      }
    ]
  }
};

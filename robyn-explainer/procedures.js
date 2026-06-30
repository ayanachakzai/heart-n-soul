/* ============================================================
   procedures.js — seeded, easy-read procedures
   Global (no build step), so the app also runs from a file.

   Each step is ONE short sentence, ONE message, with a clean
   symbol and a plain "why".
   Optional fields:
     term   { word, gloss }  hard word + plain meaning
     note   "Good to know" line (gentle warning / reassurance)
     soothe true             offer the 3-2-1 countdown (needle only)
     type   "consent"        a choice she makes; shown to staff
     staff  short line addressed to the person doing the test
   ============================================================ */
window.PROCEDURES = {

  "blood-test": {
    id: "blood-test",
    title: "Blood test",
    icon: "bloodtype",
    kind: "blood",
    steps: [
      {
        icon: "chair",
        text: "You sit down in a comfy chair.",
        why: "A comfy chair helps you feel calm and steady."
      },
      {
        icon: "badge",
        text: "A nurse says hello and checks who you are.",
        note: "They ask your name, your date of birth, and your address.",
        why: "This makes sure the care is right for you."
      },
      {
        icon: "sanitizer",
        text: "The nurse cleans a small patch of your skin.",
        note: "The wipe can feel cold or a little itchy. That is okay.",
        why: "Cleaning keeps germs away so you stay safe.",
        term: { word: "germs", gloss: "tiny bugs that can make you poorly" }
      },
      {
        type: "consent",
        icon: "front_hand",
        text: "Where would you like the blood taken from?",
        why: "We write it down. The nurse will use the spot you choose.",
        staff: "Please take my blood from {choice}.",
        choices: [
          { value: "my left arm", icon: "back_hand" },
          { value: "my right arm", icon: "front_hand" },
          { value: "the back of my hand", icon: "pan_tool" }
        ]
      },
      {
        icon: "vaccines",
        text: "A small needle takes a little blood.",
        note: "It may feel like a quick, sharp scratch. Then it is over.",
        why: "We check your blood to see how your body is doing.",
        term: { word: "needle", gloss: "a thin, hollow pin" },
        soothe: true
      },
      {
        icon: "back_hand",
        text: "The nurse presses soft cotton wool on the spot.",
        why: "Gentle pressing stops any bleeding, nice and quick."
      },
      {
        icon: "healing",
        text: "A plaster goes on top. You are all done.",
        why: "The plaster keeps it clean while it heals."
      }
    ]
  },

  "blood-pressure": {
    id: "blood-pressure",
    title: "Blood pressure check",
    icon: "monitor_heart",
    kind: "other",
    steps: [
      {
        icon: "chair",
        text: "You sit down and rest your arm on the table.",
        why: "Resting your arm helps us get a good reading."
      },
      {
        icon: "badge",
        text: "A nurse says hello and checks who you are.",
        note: "They ask your name, your date of birth, and your address.",
        why: "This makes sure the care is right for you."
      },
      {
        icon: "cardiology",
        text: "A soft band wraps around your arm.",
        note: "The band feels firm, a bit like a hug on your arm.",
        why: "The band needs to be snug to do its job.",
        term: { word: "snug", gloss: "close and a little tight" }
      },
      {
        icon: "compress",
        text: "The band squeezes for a few seconds, then lets go.",
        why: "The squeeze measures how your blood is flowing."
      },
      {
        icon: "check_circle",
        text: "All done. The band comes off.",
        why: "We write down the number to check your health."
      }
    ]
  }
};

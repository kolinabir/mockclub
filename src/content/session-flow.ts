/** "What your hour actually looks like" — a genuine walkthrough of one session,
 *  not filler. Also seeds the SessionFlow section and answers real search
 *  intent ("what happens in a mock interview"). */
export type FlowStep = { when: string; title: string; body: string };

export const SESSION_FLOW: FlowStep[] = [
  {
    when: "Before",
    title: "You get the link and the format",
    body: "The moment you book, both calendars get the meeting link with reminders, and you get a short note on what to expect — the format, roughly what will be covered, and how long each part runs. No surprises, no scramble two minutes before.",
  },
  {
    when: "First 5 min",
    title: "They calibrate to you",
    body: "Your interviewer has read what you are practising for — your track, your level, the role you are aiming at. The session opens with a quick check-in so the next hour is pitched at the right difficulty, in the language you chose, not a generic script.",
  },
  {
    when: "The middle",
    title: "A real interview, real pressure",
    body: "Around forty minutes of the actual thing — coding, a case, a portfolio walk-through, a pitch, whatever your track calls for. It is meant to feel like the real loop, because the point is to be tested before it counts, by someone who has run these interviews for a living.",
  },
  {
    when: "Last 15 min",
    title: "Feedback you can act on",
    body: "Not a polite 'good job'. Honest, structured feedback — the specific things that landed, the specific gaps to close, and a real would-I-move-you-forward read. The kind of feedback a real interviewer almost never gets to give you.",
  },
  {
    when: "After",
    title: "It lands in writing",
    body: "The written feedback arrives in your inbox, so you can work on the gaps and come back to book another round when you are ready. Progress you can actually track, session over session.",
  },
];

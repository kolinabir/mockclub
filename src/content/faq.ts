/**
 * Shared by the FAQ section and the FAQPage JSON-LD, so the structured data
 * can never drift from what's actually rendered — which is exactly what
 * Google penalises.
 */

export type FaqItem = { q: string; a: string };

export const FAQ: FaqItem[] = [
  {
    q: "Is it actually free? What's the catch?",
    a: "It is free, and it always will be. There is no payment code in this product and there never will be — no card, no credits you can buy, no premium tier waiting behind a curtain. Everyone interviewing here is a volunteer giving an hour because someone once did it for them. Hosting is covered by donations and company sponsorship, never by you.",
  },
  {
    q: "Who are the interviewers?",
    a: "People who currently work in the field and have sat on the hiring side of the table — engineers, PMs, designers, marketers, founders. Every applicant is reviewed by a moderator before they appear, and most verify a work email domain. You will see their background, their track, and their reviews before you book.",
  },
  {
    q: "Do you use AI to run the interviews?",
    a: "No. Not now, not later. Every session is one human talking to another human. AI interview tools already exist and we are not one of them — the entire point of this club is that a person who has done the job gives you their time and their honest read.",
  },
  {
    q: "What languages can I interview in?",
    a: "Whichever one your real interview will be in. Language is a matching filter, not an afterthought — you pick it when you book, and we only show you interviewers who speak it. Most global platforms are English-only; that has never matched how hiring actually works.",
  },
  {
    q: "Can I be an interviewer?",
    a: "Please do — this only works if enough people give an hour. You set your own capacity, so it can be one session a month. We hand you a levelled question pack and a rubric, so your prep cost is zero and your total commitment is exactly the hour you agreed to.",
  },
  {
    q: "What happens if someone doesn't show up?",
    a: "Both people mark attendance, and no-shows carry real consequences on a rolling window — warnings first, then booking limits, then a break from the platform. Volunteer time is the scarcest thing here and we protect it. There is always an appeal path to a human moderator.",
  },
];

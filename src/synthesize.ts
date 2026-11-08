import type { DevelopedCase, FeedbackEntry, Person, Synthesis } from "./types";
import { giverKindLabel } from "./constants";

const STRENGTH =
  /\b(clear|excellent|strong|thorough|empath|compassion|organized|accurate|respect|permission|nicely|effective|complete|genuine|eased|plain language)\b/i;
const GROWTH =
  /\b(missed|missing|did not|didn't|narrow|unclear|consider|needs|improve|forgot|omitted|limited|should|could have|wasn't|was not|left out|thin)\b/i;

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function modePhrase(mode: FeedbackEntry["mode"]): string {
  switch (mode) {
    case "speech":
      return "dictated comments";
    case "upload":
      return "uploaded notes";
    case "recording":
      return "a recording";
    case "revised_narrative":
      return "a revised sample narrative";
  }
}

export function synthesize(input: {
  entries: FeedbackEntry[];
  student: Person;
  developed: DevelopedCase;
  givers: Person[];
}): Omit<Synthesis, "id" | "createdAt"> | null {
  const { entries, student, developed, givers } = input;
  if (entries.length === 0) return null;

  const strengths: string[] = [];
  const growth: string[] = [];
  const notes: string[] = [];
  const push = (bucket: string[], line: string) => {
    const trimmed = line.trim();
    if (!trimmed || bucket.includes(trimmed) || bucket.length >= 6) return;
    bucket.push(trimmed);
  };

  for (const entry of entries) {
    for (const mark of entry.marks) {
      if (mark.mark === "met") {
        push(strengths, `${mark.domainName} · ${mark.skillName}: ${mark.itemText}`);
      } else if (mark.mark === "not_met") {
        push(growth, `${mark.domainName} · ${mark.skillName}: ${mark.itemText}`);
      }
    }
    for (const sentence of sentences(entry.transcript)) {
      if (GROWTH.test(sentence)) push(growth, sentence);
      else if (STRENGTH.test(sentence)) push(strengths, sentence);
      else push(notes, sentence);
    }
  }

  const giverNames = entries.map((entry) => {
    const giver = givers.find((p) => p.id === entry.giverId);
    const kind = giver?.giverKinds[0] ? giverKindLabel(giver.giverKinds[0]) : "Feedback giver";
    return giver ? `${giver.name} (${kind})` : "A feedback giver";
  });
  const uniqueGivers = [...new Set(giverNames)];
  const modes = [...new Set(entries.map((entry) => modePhrase(entry.mode)))];
  const firstName = student.name.split(" ")[0];

  const lead = `${uniqueGivers.length} ${uniqueGivers.length === 1 ? "person" : "people"} gave feedback on ${developed.title} for ${firstName}, from ${modes.join(", ")}.`;
  const strengthLine =
    strengths.length > 0
      ? `What held up: ${strengths
          .slice(0, 2)
          .map((line) => line.replace(/^.*?:\s*/, ""))
          .join("; ")}.`
      : "The comments do not yet name a specific strength.";
  const growthLine =
    growth.length > 0
      ? `What to practice next: ${growth
          .slice(0, 2)
          .map((line) => line.replace(/^.*?:\s*/, ""))
          .join("; ")}.`
      : "The comments do not yet name a specific next step.";

  const critical = developed.domains.flatMap((d) => d.skills.flatMap((s) => s.items.filter((i) => i.critical).map((i) => i.text)));
  const criticalLine =
    critical.length > 0 ? `Critical checklist items on this case include: ${critical.slice(0, 3).join("; ")}.` : "";

  return {
    caseId: developed.id,
    studentId: student.id,
    strengths,
    growth,
    notes,
    narrative: [lead, strengthLine, growthLine, criticalLine].filter(Boolean).join(" "),
    sourceIds: entries.map((entry) => entry.id),
  };
}

import type { Level, Person, ScoreRecord } from "./types";
import { LEVELS } from "./constants";

export interface DemoFilters {
  cohort: string | "all";
  gender: string | "all";
  race: string | "all";
  ethnicity: string | "all";
  urim: "all" | "yes" | "no";
  level: Level | "all";
}

export const EMPTY_FILTERS: DemoFilters = {
  cohort: "all",
  gender: "all",
  race: "all",
  ethnicity: "all",
  urim: "all",
  level: "all",
};

export function matchPerson(person: Person, filters: DemoFilters): boolean {
  if (filters.cohort !== "all" && person.cohort !== filters.cohort) return false;
  if (filters.gender !== "all" && person.gender !== filters.gender) return false;
  if (filters.race !== "all" && person.race !== filters.race) return false;
  if (filters.ethnicity !== "all" && person.ethnicity !== filters.ethnicity) return false;
  if (filters.urim === "yes" && !person.urim) return false;
  if (filters.urim === "no" && person.urim) return false;
  if (filters.level !== "all" && person.level !== filters.level) return false;
  return true;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Hide a group mean when fewer than 3 learners are in the cell. */
export const MIN_CELL = 3;

export function domainMeans(
  people: Person[],
  scores: ScoreRecord[],
  domainNames: string[],
  pick: (person: Person, score: ScoreRecord) => boolean,
): { domain: string; mean: number | null; n: number }[] {
  return domainNames.map((domain) => {
    const values: number[] = [];
    for (const person of people) {
      const mine = scores.filter((score) => score.studentId === person.id && score.domainName === domain && pick(person, score));
      const m = mean(mine.map((s) => s.score));
      if (m != null) values.push(m);
    }
    return {
      domain,
      n: values.length,
      mean: values.length >= MIN_CELL ? mean(values) : null,
    };
  });
}

export function longitudinal(
  people: Person[],
  scores: ScoreRecord[],
  domainNames: string[],
): { level: Level; label: string; points: { domain: string; mean: number | null; n: number }[] }[] {
  return LEVELS.map((level) => ({
    level: level.id,
    label: level.label,
    points: domainNames.map((domain) => {
      const values = scores
        .filter(
          (score) =>
            score.domainName === domain &&
            score.trainingYear === level.id &&
            score.caseId == null &&
            people.some((p) => p.id === score.studentId),
        )
        .map((score) => score.score);
      const n = new Set(
        scores
          .filter(
            (score) =>
              score.domainName === domain &&
              score.trainingYear === level.id &&
              score.caseId == null &&
              people.some((p) => p.id === score.studentId),
          )
          .map((s) => s.studentId),
      ).size;
      return { domain, n, mean: n >= MIN_CELL ? mean(values) : null };
    }),
  }));
}

export function breakdown(
  people: Person[],
  scores: ScoreRecord[],
  key: (person: Person) => string,
): { group: string; n: number; mean: number | null }[] {
  const groups = new Map<string, Person[]>();
  for (const person of people) {
    const name = key(person);
    const list = groups.get(name) ?? [];
    list.push(person);
    groups.set(name, list);
  }
  return [...groups.entries()]
    .map(([group, members]) => {
      const values: number[] = [];
      for (const person of members) {
        const mine = scores.filter((s) => s.studentId === person.id && s.caseId == null && s.trainingYear === person.level);
        const m = mean(mine.map((s) => s.score));
        if (m != null) values.push(m);
      }
      return {
        group,
        n: members.length,
        mean: members.length >= MIN_CELL ? mean(values) : null,
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group));
}

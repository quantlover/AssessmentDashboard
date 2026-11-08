import { CANONICAL_DOMAINS, DEFAULT_TARGET } from "./constants";
import { clone, uid } from "./ids";
import type {
  Blueprint,
  CaseType,
  ChecklistItem,
  DevelopedCase,
  Domain,
  Level,
  ScenarioId,
  Skill,
} from "./types";

export type SkillStatus = "ready" | "thin" | "empty";
export type DomainStatus = "ready" | "mixed" | "thin" | "empty" | "open";

export interface SkillCoverage {
  key: string;
  scenario: ScenarioId;
  caseType: CaseType;
  level: Level | "mixed";
  domainName: string;
  skillName: string;
  itemCount: number;
  target: number;
  items: ChecklistItem[];
  blueprintIds: string[];
  blueprintTitles: string[];
  status: SkillStatus;
}

export interface DomainCoverage {
  key: string;
  scenario: ScenarioId;
  caseType: CaseType;
  domainName: string;
  skills: SkillCoverage[];
  itemCount: number;
  readySkillCount: number;
  status: DomainStatus;
}

export interface CoverageModel {
  domainNames: string[];
  cells: DomainCoverage[];
  skills: SkillCoverage[];
}

export function skillKey(scenario: ScenarioId, domainName: string, skillName: string) {
  return `${scenario}|${domainName}|${skillName}`.toLowerCase();
}

export function domainKey(scenario: ScenarioId, domainName: string) {
  return `${scenario}|${domainName}`.toLowerCase();
}

function skillStatus(count: number, target: number): SkillStatus {
  if (count <= 0) return "empty";
  if (count >= target) return "ready";
  return "thin";
}

function domainStatus(skills: SkillCoverage[]): DomainStatus {
  if (skills.length === 0) return "open";
  const ready = skills.filter((s) => s.status === "ready").length;
  const items = skills.reduce((sum, s) => sum + s.itemCount, 0);
  if (items === 0) return "empty";
  if (ready === skills.length) return "ready";
  if (ready > 0) return "mixed";
  return "thin";
}

export function buildCoverage(
  blueprints: Blueprint[],
  filter: { caseType: CaseType; level: Level | "all" },
): CoverageModel {
  const scoped = blueprints.filter(
    (bp) => bp.caseType === filter.caseType && (filter.level === "all" || bp.level === filter.level),
  );

  const groups = new Map<string, SkillCoverage>();

  for (const bp of scoped) {
    for (const domain of bp.domains) {
      for (const skill of domain.skills) {
        const key = skillKey(bp.scenario, domain.name, skill.name);
        let group = groups.get(key);
        if (!group) {
          group = {
            key,
            scenario: bp.scenario,
            caseType: bp.caseType,
            level: bp.level,
            domainName: domain.name,
            skillName: skill.name,
            itemCount: 0,
            target: skill.targetItems,
            items: [],
            blueprintIds: [],
            blueprintTitles: [],
            status: "empty",
          };
          groups.set(key, group);
        }
        if (!group.blueprintIds.includes(bp.id)) {
          group.blueprintIds.push(bp.id);
          group.blueprintTitles.push(bp.title);
        }
        if (group.level !== bp.level) group.level = "mixed";
        group.target = Math.max(group.target, skill.targetItems);
        for (const item of skill.items) {
          const seen = group.items.some((existing) => existing.text.trim().toLowerCase() === item.text.trim().toLowerCase());
          if (!seen && item.text.trim()) group.items.push(item);
        }
      }
    }
  }

  const skills = [...groups.values()].map((group) => {
    group.itemCount = group.items.length;
    group.status = skillStatus(group.itemCount, group.target);
    return group;
  });

  const extraDomains = [...new Set(skills.map((s) => s.domainName))].filter(
    (name) => !CANONICAL_DOMAINS.includes(name as (typeof CANONICAL_DOMAINS)[number]),
  );
  const domainNames = [...CANONICAL_DOMAINS, ...extraDomains];

  const cells: DomainCoverage[] = [];
  for (const scenario of ["abdominal_pain", "back_pain", "headache", "chest_pain", "dyspnea", "dizziness", "fatigue", "joint_pain"] as ScenarioId[]) {
    for (const domainName of domainNames) {
      const domainSkills = skills
        .filter((s) => s.scenario === scenario && s.domainName === domainName)
        .sort((a, b) => a.skillName.localeCompare(b.skillName));
      cells.push({
        key: domainKey(scenario, domainName),
        scenario,
        caseType: filter.caseType,
        domainName,
        skills: domainSkills,
        itemCount: domainSkills.reduce((sum, s) => sum + s.itemCount, 0),
        readySkillCount: domainSkills.filter((s) => s.status === "ready").length,
        status: domainStatus(domainSkills),
      });
    }
  }

  skills.sort((a, b) => a.scenario.localeCompare(b.scenario) || a.domainName.localeCompare(b.domainName) || a.skillName.localeCompare(b.skillName));
  return { domainNames, cells, skills };
}

export function cellAt(model: CoverageModel, scenario: ScenarioId, domainName: string) {
  return model.cells.find((cell) => cell.scenario === scenario && cell.domainName === domainName);
}

export function domainsFromSkills(selected: SkillCoverage[]): Domain[] {
  const byDomain = new Map<string, SkillCoverage[]>();
  for (const skill of selected) {
    const list = byDomain.get(skill.domainName) ?? [];
    list.push(skill);
    byDomain.set(skill.domainName, list);
  }
  return [...byDomain.entries()].map(([name, skills]) => ({
    id: uid("dom"),
    name,
    skills: skills.map<Skill>((skill) => ({
      id: uid("skill"),
      name: skill.skillName,
      targetItems: skill.target,
      items: skill.items.map((item) => ({
        id: uid("item"),
        text: item.text,
        critical: item.critical,
        points: item.points,
      })),
    })),
  }));
}

export function developCase(input: {
  title: string;
  stem: string;
  level: Level;
  scenario: ScenarioId;
  caseType: CaseType;
  skills: SkillCoverage[];
  blueprintId: string | null;
  omittedSkillCount: number;
  assignedCohorts: string[];
}): DevelopedCase {
  return {
    id: uid("case"),
    blueprintId: input.blueprintId,
    title: input.title.trim() || "Untitled case",
    scenario: input.scenario,
    caseType: input.caseType,
    level: input.level,
    stem: input.stem.trim(),
    domains: domainsFromSkills(input.skills),
    status: "draft",
    assignedCohorts: input.assignedCohorts,
    createdAt: new Date().toISOString(),
    omittedSkillCount: input.omittedSkillCount,
  };
}

export function rekeyBlueprint(bp: Blueprint, title?: string): Blueprint {
  const copy = clone(bp);
  copy.id = uid("bp");
  copy.title = title ?? `${bp.title} (copy)`;
  copy.updatedAt = new Date().toISOString();
  for (const domain of copy.domains) {
    domain.id = uid("dom");
    for (const skill of domain.skills) {
      skill.id = uid("skill");
      for (const item of skill.items) item.id = uid("item");
    }
  }
  for (const narrative of copy.narratives) narrative.id = uid("nar");
  return copy;
}

export function blankBlueprint(partial: Partial<Blueprint> & Pick<Blueprint, "scenario" | "caseType">): Blueprint {
  const target = DEFAULT_TARGET[partial.caseType];
  return {
    id: uid("bp"),
    title: partial.title ?? "New blueprint",
    scenario: partial.scenario,
    caseType: partial.caseType,
    level: partial.level ?? "Y2",
    vignette: partial.vignette ?? "",
    domains: partial.domains ?? [
      {
        id: uid("dom"),
        name: "History",
        skills: [
          {
            id: uid("skill"),
            name: "New skill",
            targetItems: target,
            items: [],
          },
        ],
      },
    ],
    narratives: partial.narratives ?? [],
    updatedAt: new Date().toISOString(),
  };
}

export function statusLabel(status: DomainStatus | SkillStatus | "open"): string {
  switch (status) {
    case "ready":
      return "Enough items";
    case "mixed":
      return "Some skills ready";
    case "thin":
      return "Needs items";
    case "empty":
      return "No items yet";
    default:
      return "No blueprint";
  }
}

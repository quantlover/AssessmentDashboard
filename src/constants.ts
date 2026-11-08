import type { CaseType, GiverKind, Level, PageId, Race, Role, ScenarioId } from "./types";

export const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: "abdominal_pain", label: "Abdominal pain" },
  { id: "back_pain", label: "Back pain" },
  { id: "headache", label: "Headache" },
  { id: "chest_pain", label: "Chest pain" },
  { id: "dyspnea", label: "Shortness of breath" },
  { id: "dizziness", label: "Dizziness" },
  { id: "fatigue", label: "Fatigue" },
  { id: "joint_pain", label: "Joint pain" },
];

export const CANONICAL_DOMAINS = [
  "History",
  "Physical examination",
  "Clinical reasoning",
  "Communication",
  "Osteopathic examination",
  "Professionalism",
  "Patient education",
] as const;

export const DOMAIN_SHORT: Record<string, string> = {
  History: "History",
  "Physical examination": "Physical",
  "Clinical reasoning": "Reasoning",
  Communication: "Communication",
  "Osteopathic examination": "Osteopathic",
  Professionalism: "Professionalism",
  "Patient education": "Education",
};

export const DOMAIN_COLOR: Record<string, string> = {
  History: "#0e6b66",
  "Physical examination": "#1d4e89",
  "Clinical reasoning": "#9a5b16",
  Communication: "#6941a0",
  "Osteopathic examination": "#2f6b45",
  Professionalism: "#8d3b32",
  "Patient education": "#3d5a80",
};

export const CASE_TYPES: { id: CaseType; label: string; hint: string }[] = [
  {
    id: "osce",
    label: "OSCE",
    hint: "Objective Structured Clinical Examination",
  },
  {
    id: "reflection",
    label: "Reflection",
    hint: "Student reflection",
  },
  {
    id: "direct_observation",
    label: "Observation",
    hint: "Direct observation",
  },
];

export const DEFAULT_TARGET: Record<CaseType, number> = {
  osce: 4,
  reflection: 2,
  direct_observation: 3,
};

export const LEVELS: { id: Level; label: string }[] = [
  { id: "Y1", label: "Year 1" },
  { id: "Y2", label: "Year 2" },
  { id: "Y3", label: "Year 3" },
  { id: "Y4", label: "Year 4" },
];

export const LEVEL_HINT = "Year 1–4 covers OMS1–OMS4 and MS1–MS4.";

export const ROLES: { id: Role; label: string; blurb: string }[] = [
  { id: "student", label: "Student", blurb: "Uploads work, reads synthesized feedback, compiles a portfolio." },
  {
    id: "feedback_giver",
    label: "Feedback giver",
    blurb: "Faculty, educators, standardized patients, students, or upper-class peers.",
  },
  {
    id: "assessment_educator",
    label: "Assessment educator",
    blurb: "Builds rubrics, sample narratives, and the case blueprint.",
  },
  { id: "admin", label: "Admin", blurb: "Does all of the above and assigns roles." },
];

export const GIVER_KINDS: { id: GiverKind; label: string }[] = [
  { id: "faculty", label: "Faculty" },
  { id: "assessment_educator", label: "Assessment educator" },
  { id: "standardized_patient", label: "Standardized patient" },
  { id: "student", label: "Student" },
  { id: "upper_class_peer", label: "Upper-class peer" },
];

export const RACES: Race[] = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Two or more races",
  "Prefer not to say",
];

export const PAGES: { id: PageId; label: string; lede: string; roles: Role[] }[] = [
  {
    id: "coverage",
    label: "Coverage",
    lede: "See which scenario, domain, and skill combinations have enough checklist items to develop a case.",
    roles: ["assessment_educator", "admin"],
  },
  {
    id: "studio",
    label: "Blueprint studio",
    lede: "Build a case as domains, skills, and checklist items, and set how many items are enough.",
    roles: ["assessment_educator", "admin"],
  },
  {
    id: "cases",
    label: "Cases",
    lede: "Cases developed from ready skills. Assign a case to a class.",
    roles: ["assessment_educator", "admin", "feedback_giver"],
  },
  {
    id: "narratives",
    label: "Sample narratives",
    lede: "Example feedback that givers can choose and revise. Typed or uploaded as text.",
    roles: ["assessment_educator", "admin", "feedback_giver"],
  },
  {
    id: "analytics",
    label: "Cohort view",
    lede: "Cross-sectional and longitudinal results by class, student, and recorded demographics.",
    roles: ["assessment_educator", "admin"],
  },
  {
    id: "people",
    label: "People and roles",
    lede: "Assign one or more roles. A person can be a student and a feedback giver at the same time.",
    roles: ["admin"],
  },
  {
    id: "feedback",
    label: "Give feedback",
    lede: "Dictate, upload, or record. The transcript is saved and synthesized for the student.",
    roles: ["feedback_giver", "admin", "assessment_educator"],
  },
  {
    id: "portfolio",
    label: "Portfolio",
    lede: "A progress portfolio of cases, checklist patterns, and synthesized feedback.",
    roles: ["student", "admin", "assessment_educator"],
  },
];

export function pagesFor(role: Role) {
  return PAGES.filter((page) => page.roles.includes(role));
}

export function scenarioLabel(id: ScenarioId) {
  return SCENARIOS.find((s) => s.id === id)?.label ?? id;
}

export function caseTypeLabel(id: CaseType) {
  return CASE_TYPES.find((c) => c.id === id)?.hint ?? id;
}

export function levelLabel(id: Level) {
  return LEVELS.find((l) => l.id === id)?.label ?? id;
}

export function roleLabel(id: Role) {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export function giverKindLabel(id: GiverKind) {
  return GIVER_KINDS.find((g) => g.id === id)?.label ?? id;
}

export function domainColor(name: string) {
  return DOMAIN_COLOR[name] ?? "#5e574e";
}

export function shortDomain(name: string) {
  return DOMAIN_SHORT[name] ?? name;
}

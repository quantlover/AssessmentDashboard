export type Role = "student" | "feedback_giver" | "assessment_educator" | "admin";

export type GiverKind =
  | "faculty"
  | "assessment_educator"
  | "standardized_patient"
  | "student"
  | "upper_class_peer";

export type CaseType = "osce" | "reflection" | "direct_observation";

export type ScenarioId =
  | "abdominal_pain"
  | "back_pain"
  | "headache"
  | "chest_pain"
  | "dyspnea"
  | "dizziness"
  | "fatigue"
  | "joint_pain";

export type Level = "Y1" | "Y2" | "Y3" | "Y4";

export type Gender = "Woman" | "Man" | "Nonbinary" | "Prefer not to say";

export type Ethnicity = "Hispanic or Latino" | "Not Hispanic or Latino" | "Prefer not to say";

export type Race =
  | "American Indian or Alaska Native"
  | "Asian"
  | "Black or African American"
  | "Native Hawaiian or Other Pacific Islander"
  | "White"
  | "Two or more races"
  | "Prefer not to say";

export type PageId =
  | "coverage"
  | "studio"
  | "cases"
  | "narratives"
  | "analytics"
  | "people"
  | "feedback"
  | "portfolio";

export interface ChecklistItem {
  id: string;
  text: string;
  critical: boolean;
  points: number;
}

export interface Skill {
  id: string;
  name: string;
  /** A skill can support a case once the checklist reaches this count. */
  targetItems: number;
  items: ChecklistItem[];
}

export interface Domain {
  id: string;
  name: string;
  skills: Skill[];
}

export interface Narrative {
  id: string;
  title: string;
  body: string;
  tone: "strength" | "growth" | "balanced";
}

/** A case plan: scenario and case type, then domains → skills → checklist items. */
export interface Blueprint {
  id: string;
  title: string;
  scenario: ScenarioId;
  caseType: CaseType;
  level: Level;
  vignette: string;
  domains: Domain[];
  narratives: Narrative[];
  updatedAt: string;
}

export type CaseStatus = "draft" | "pilot" | "active";

export interface DevelopedCase {
  id: string;
  blueprintId: string | null;
  title: string;
  scenario: ScenarioId;
  caseType: CaseType;
  level: Level;
  stem: string;
  domains: Domain[];
  status: CaseStatus;
  assignedCohorts: string[];
  createdAt: string;
  omittedSkillCount: number;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  roles: Role[];
  giverKinds: GiverKind[];
  gender: Gender;
  race: Race;
  ethnicity: Ethnicity;
  /** Recorded by the school. The app does not infer this from race or ethnicity. */
  urim: boolean;
  cohort: string;
  level: Level;
}

export type FeedbackMode = "speech" | "upload" | "recording" | "revised_narrative";

export interface ItemMark {
  itemId: string;
  itemText: string;
  skillName: string;
  domainName: string;
  mark: "met" | "not_met" | "not_observed";
}

export interface FeedbackEntry {
  id: string;
  caseId: string;
  studentId: string;
  giverId: string;
  mode: FeedbackMode;
  transcript: string;
  attachmentName?: string;
  narrativeTitle?: string;
  marks: ItemMark[];
  createdAt: string;
}

export interface Synthesis {
  id: string;
  caseId: string;
  studentId: string;
  strengths: string[];
  growth: string[];
  notes: string[];
  narrative: string;
  sourceIds: string[];
  createdAt: string;
}

export interface ScoreRecord {
  id: string;
  studentId: string;
  caseId: string | null;
  domainName: string;
  score: number;
  date: string;
  trainingYear: Level;
}

export interface Portfolio {
  studentId: string;
  statement: string;
  compiledAt: string | null;
}

export interface Focus {
  blueprintId?: string;
  caseId?: string;
  studentId?: string;
  narrativeId?: string;
}

export interface AppState {
  people: Person[];
  blueprints: Blueprint[];
  cases: DevelopedCase[];
  feedback: FeedbackEntry[];
  syntheses: Synthesis[];
  scores: ScoreRecord[];
  portfolios: Portfolio[];
  activeRole: Role;
  activePersonId: string;
  page: PageId;
  focus: Focus;
}

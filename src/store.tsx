import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { pagesFor } from "./constants";
import { uid } from "./ids";
import { createSeed } from "./seed";
import { synthesize } from "./synthesize";
import type {
  AppState,
  Blueprint,
  DevelopedCase,
  FeedbackEntry,
  Focus,
  PageId,
  Person,
  Portfolio,
  Role,
} from "./types";

const KEY = "assessment-blueprint-v1";

type Action =
  | { type: "go"; page: PageId; focus?: Partial<Focus> }
  | { type: "set-role"; role: Role }
  | { type: "set-person"; personId: string }
  | { type: "save-blueprint"; blueprint: Blueprint }
  | { type: "delete-blueprint"; id: string }
  | { type: "save-case"; developed: DevelopedCase }
  | { type: "save-person"; person: Person }
  | { type: "add-feedback"; entry: FeedbackEntry }
  | { type: "save-portfolio"; portfolio: Portfolio }
  | { type: "restore" };

function persisted(state: AppState) {
  return {
    version: 1,
    people: state.people,
    blueprints: state.blueprints,
    cases: state.cases,
    feedback: state.feedback,
    syntheses: state.syntheses,
    scores: state.scores,
    portfolios: state.portfolios,
    activeRole: state.activeRole,
    activePersonId: state.activePersonId,
    page: state.page,
  };
}

function sanitize(state: AppState): AppState {
  const allowed = pagesFor(state.activeRole).map((page) => page.id);
  const page = allowed.includes(state.page) ? state.page : (allowed[0] ?? "coverage");
  const person = state.people.find((p) => p.id === state.activePersonId);
  const fallback = state.people.find((p) => p.roles.includes(state.activeRole));
  return {
    ...state,
    page,
    focus: state.focus ?? {},
    activePersonId: person?.roles.includes(state.activeRole) ? state.activePersonId : (fallback?.id ?? state.activePersonId),
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return createSeed();
    const parsed = JSON.parse(raw) as { version?: number } & Partial<AppState>;
    if (parsed.version !== 1 || !parsed.blueprints || !parsed.people || !parsed.cases) return createSeed();
    return sanitize({ ...createSeed(), ...parsed, focus: {} });
  } catch {
    return createSeed();
  }
}

function withSynthesis(state: AppState, feedback: FeedbackEntry[], caseId: string, studentId: string): AppState["syntheses"] {
  const developed = state.cases.find((c) => c.id === caseId);
  const student = state.people.find((p) => p.id === studentId);
  const entries = feedback.filter((entry) => entry.caseId === caseId && entry.studentId === studentId);
  const rest = state.syntheses.filter((item) => !(item.caseId === caseId && item.studentId === studentId));
  if (!developed || !student || entries.length === 0) return rest;
  const built = synthesize({ entries, student, developed, givers: state.people });
  if (!built) return rest;
  return [...rest, { ...built, id: uid("syn"), createdAt: new Date().toISOString() }];
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "go":
      return sanitize({ ...state, page: action.page, focus: { ...state.focus, ...action.focus } });
    case "set-role": {
      const preferred: Record<Role, string> = {
        student: "p-elena",
        feedback_giver: "p-raman",
        assessment_educator: "p-shah",
        admin: "p-shah",
      };
      const people = state.people.filter((p) => p.roles.includes(action.role));
      const person =
        people.find((p) => p.id === state.activePersonId) ??
        people.find((p) => p.id === preferred[action.role]) ??
        people[0];
      return sanitize({ ...state, activeRole: action.role, activePersonId: person?.id ?? state.activePersonId });
    }
    case "set-person":
      return sanitize({ ...state, activePersonId: action.personId });
    case "save-blueprint": {
      const index = state.blueprints.findIndex((bp) => bp.id === action.blueprint.id);
      const blueprints = state.blueprints.slice();
      if (index === -1) blueprints.unshift(action.blueprint);
      else blueprints[index] = action.blueprint;
      return { ...state, blueprints };
    }
    case "delete-blueprint":
      return { ...state, blueprints: state.blueprints.filter((bp) => bp.id !== action.id) };
    case "save-case": {
      const index = state.cases.findIndex((item) => item.id === action.developed.id);
      const cases = state.cases.slice();
      if (index === -1) cases.unshift(action.developed);
      else cases[index] = action.developed;
      return { ...state, cases, focus: { ...state.focus, caseId: action.developed.id } };
    }
    case "save-person": {
      const index = state.people.findIndex((p) => p.id === action.person.id);
      const people = state.people.slice();
      if (index === -1) people.push(action.person);
      else people[index] = action.person;
      return sanitize({ ...state, people });
    }
    case "add-feedback": {
      const feedback = [...state.feedback, action.entry];
      return {
        ...state,
        feedback,
        syntheses: withSynthesis(state, feedback, action.entry.caseId, action.entry.studentId),
      };
    }
    case "save-portfolio": {
      const portfolios = state.portfolios.filter((p) => p.studentId !== action.portfolio.studentId);
      return { ...state, portfolios: [...portfolios, action.portfolio] };
    }
    case "restore":
      return createSeed();
    default:
      return state;
  }
}

interface Toast {
  id: string;
  text: string;
  onUndo?: () => void;
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  toasts: Toast[];
  toast: (text: string, onUndo?: () => void) => void;
  dismiss: (id: string) => void;
  sessionAudio: Record<string, string>;
  rememberAudio: (id: string, url: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sessionAudio, setSessionAudio] = useState<Record<string, string>>({});

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(persisted(state)));
  }, [state]);

  const api = useMemo<StoreValue>(() => {
    return {
      state,
      dispatch,
      toasts,
      sessionAudio,
      toast: (text, onUndo) => {
        const id = uid("toast");
        setToasts((current) => [...current, { id, text, onUndo }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 6000);
      },
      dismiss: (id) => setToasts((current) => current.filter((toast) => toast.id !== id)),
      rememberAudio: (id, url) => setSessionAudio((current) => ({ ...current, [id]: url })),
    };
  }, [state, toasts, sessionAudio]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useApp() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useApp must be used inside StoreProvider");
  return value;
}

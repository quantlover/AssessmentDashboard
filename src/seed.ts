import { CANONICAL_DOMAINS, scenarioLabel } from "./constants";
import { buildCoverage, developCase } from "./coverage";
import { synthesize } from "./synthesize";
import type {
  AppState,
  Blueprint,
  ChecklistItem,
  Domain,
  FeedbackEntry,
  Level,
  Person,
  Skill,
} from "./types";

function items(prefix: string, lines: string[]): ChecklistItem[] {
  return lines.map((line, index) => {
    const critical = line.startsWith("!");
    return {
      id: `${prefix}-${index + 1}`,
      text: (critical ? line.slice(1) : line).trim(),
      critical,
      points: critical ? 2 : 1,
    };
  });
}

function skill(id: string, name: string, target: number, lines: string[]): Skill {
  return { id, name, targetItems: target, items: items(id, lines) };
}

function domain(id: string, name: string, skills: Skill[]): Domain {
  return { id, name, skills };
}

const blueprints: Blueprint[] = [
  {
    id: "bp-abd",
    title: "Abdominal pain OSCE",
    scenario: "abdominal_pain",
    caseType: "osce",
    level: "Y2",
    vignette:
      "A 23-year-old comes to clinic with two days of lower abdominal pain and is able to speak in full sentences. Begin the visit.",
    updatedAt: "2026-10-12",
    narratives: [
      {
        id: "nar-abd-1",
        title: "History was organized, the differential was narrow",
        tone: "balanced",
        body: "You set a clear agenda and asked permission before the abdominal exam. Location and severity were clear. Timing and relation to meals were thin, and the differential did not mention ectopic pregnancy in a patient who could be pregnant. Close with one sentence on what to do if the pain worsens or a fever starts.",
      },
      {
        id: "nar-abd-2",
        title: "Standardized patient: felt rushed at the end",
        tone: "growth",
        body: "I understood why you were examining my abdomen, and you kept me covered. The questions came quickly, and I did not have a chance to say what worried me. I left unsure whether I should go to the emergency department.",
      },
    ],
    domains: [
      domain("dom-abd-hx", "History", [
        skill("sk-abd-hpi", "Pain history", 4, [
          "Characterizes onset, location, quality, radiation, and severity",
          "Asks about timing and relation to meals",
          "Asks about associated nausea, vomiting, or bowel changes",
          "Asks what the patient has already tried",
          "Asks what the patient is most worried about",
        ]),
        skill("sk-abd-red", "Red flag screening", 4, [
          "!Asks about fever",
          "!Asks about vomiting blood or black stool",
          "!Asks about syncope or fainting",
          "!Asks about possible pregnancy when relevant",
        ]),
        skill("sk-abd-pmh", "Past history", 4, [
          "Reviews medications and allergies",
          "Asks about prior abdominal surgery",
        ]),
      ]),
      domain("dom-abd-px", "Physical examination", [
        skill("sk-abd-exam", "Abdominal exam", 4, [
          "!Inspects before palpating",
          "Auscultates before deep palpation",
          "Palpates all four quadrants",
          "Assesses guarding or rebound when pain allows",
          "Examines the area of pain last",
        ]),
        skill("sk-abd-vitals", "Vital signs", 4, [
          "Notes temperature",
          "Notes heart rate",
          "Notes blood pressure",
          "Comments on whether the patient looks ill",
        ]),
      ]),
      domain("dom-abd-rs", "Clinical reasoning", [
        skill("sk-abd-ddx", "Differential", 4, [
          "!Names at least three plausible diagnoses",
          "!Includes a diagnosis that must not be missed",
          "Links one finding to the leading idea",
          "Says what would change the plan",
        ]),
        skill("sk-abd-acuity", "Acuity", 4, ["States whether same-day care is needed"]),
      ]),
      domain("dom-abd-com", "Communication", [
        skill("sk-abd-agenda", "Agenda and empathy", 4, [
          "Introduces self and role",
          "Sets an agenda with the patient",
          "Responds to a concern before moving on",
          "Uses plain language for the next step",
        ]),
      ]),
      domain("dom-abd-ost", "Osteopathic examination", [
        skill("sk-abd-ost", "Regional screen", 4, []),
      ]),
      domain("dom-abd-pro", "Professionalism", [
        skill("sk-abd-consent", "Consent and draping", 4, [
          "!Explains the exam before touching",
          "!Asks permission to examine",
          "Drapes so only the area examined is exposed",
          "Stops or adjusts when the patient is uncomfortable",
        ]),
      ]),
      domain("dom-abd-ed", "Patient education", [
        skill("sk-abd-safety", "Safety-netting", 4, [
          "Names one warning sign that should prompt urgent care",
          "Checks what the patient understood",
        ]),
      ]),
    ],
  },
  {
    id: "bp-back",
    title: "Back pain OSCE",
    scenario: "back_pain",
    caseType: "osce",
    level: "Y3",
    vignette:
      "A 45-year-old has had low back pain for three weeks after lifting a box. Take a focused history, examine, and decide whether hands-on treatment is appropriate.",
    updatedAt: "2026-10-20",
    narratives: [
      {
        id: "nar-back-1",
        title: "Screened red flags before OMT",
        tone: "strength",
        body: "You asked about saddle anesthesia, bowel and bladder changes, fever, and trauma before discussing hands-on treatment. The explanation of what you were feeling was clear, and you obtained consent. Name the somatic dysfunction out loud so the patient can follow the plan.",
      },
    ],
    domains: [
      domain("dom-back-hx", "History", [
        skill("sk-back-red", "Spine red flags", 4, [
          "!Asks about bowel or bladder change",
          "!Asks about saddle anesthesia",
          "!Asks about fever, cancer history, or unexplained weight loss",
          "!Asks about trauma",
          "Asks about leg weakness or numbness",
        ]),
      ]),
      domain("dom-back-px", "Physical examination", [
        skill("sk-back-neuro", "Spine and neurologic screen", 4, [
          "Observes gait and posture",
          "Assesses lumbar range of motion",
          "Checks strength in the lower limbs",
          "Checks a relevant reflex or sensation",
          "Performs a straight-leg raise when radicular pain is a concern",
        ]),
      ]),
      domain("dom-back-ost", "Osteopathic examination", [
        skill("sk-back-tart", "TART and segmental diagnosis", 4, [
          "Describes tissue texture change",
          "Notes asymmetry",
          "Assesses restriction of motion",
          "Notes tenderness",
          "!Names a somatic dysfunction related to the pain",
        ]),
        skill("sk-back-consent", "Consent for hands-on treatment", 4, [
          "!Screens red flags before offering treatment",
          "Explains the treatment in plain language",
          "Asks permission before treating",
          "Describes what the patient should feel",
        ]),
      ]),
      domain("dom-back-rs", "Clinical reasoning", [
        skill("sk-back-hold", "When not to treat", 4, [
          "States a finding that would defer hands-on treatment",
          "Names one diagnosis that needs a different pathway",
        ]),
      ]),
      domain("dom-back-com", "Communication", [
        skill("sk-back-plain", "Plain language", 4, [
          "Avoids unexplained jargon",
          "Invites questions",
          "Summarizes the plan in one or two sentences",
        ]),
      ]),
      domain("dom-back-pro", "Professionalism", [
        skill("sk-back-drape", "Draping and privacy", 4, [
          "Explains which clothing needs to be adjusted",
          "Keeps the patient covered between steps",
          "Offers a chaperone or privacy for changing",
          "Washes or sanitizes hands before the exam",
        ]),
      ]),
      domain("dom-back-ed", "Patient education", [
        skill("sk-back-home", "Home plan", 4, [
          "Offers one activity the patient can continue",
          "Describes a position that may ease pain",
          "Names a warning sign",
          "Checks understanding with teach-back",
        ]),
      ]),
    ],
  },
  {
    id: "bp-head-osce",
    title: "Headache OSCE",
    scenario: "headache",
    caseType: "osce",
    level: "Y2",
    vignette:
      "A 19-year-old has a severe headache that started this morning and is different from prior headaches. The room is quiet. Begin the encounter.",
    updatedAt: "2026-09-30",
    narratives: [
      {
        id: "nar-head-1",
        title: "Sudden onset needs an explicit acuity statement",
        tone: "growth",
        body: "You were calm and you asked about the worst-ever quality of the pain. Please say out loud whether this needs emergency care. The neurologic exam was started but visual fields and gait were not completed. The patient understood your concern.",
      },
    ],
    domains: [
      domain("dom-head-hx", "History", [
        skill("sk-head-hpi", "Onset and pattern", 4, [
          "!Asks whether the onset was sudden",
          "Asks about prior headaches",
          "Asks about nausea, light, and sound",
          "Asks about neck stiffness",
          "Asks about recent illness or medication",
        ]),
        skill("sk-head-neurohx", "Neurologic symptoms", 4, [
          "Asks about weakness",
          "Asks about vision change",
          "Asks about confusion or seizure",
          "Asks about rash",
        ]),
      ]),
      domain("dom-head-px", "Physical examination", [
        skill("sk-head-exam", "Focused neurologic exam", 4, [
          "Checks pupils",
          "Checks visual fields or extraocular movements",
        ]),
      ]),
      domain("dom-head-rs", "Clinical reasoning", [
        skill("sk-head-ddx", "Differential and acuity", 4, [
          "!Includes a dangerous cause of sudden headache",
          "Names a primary headache diagnosis",
          "Says what finding would send the patient to emergency care",
          "Does not anchor on the first familiar diagnosis",
          "States the immediate next step",
        ]),
      ]),
      domain("dom-head-com", "Communication", [
        skill("sk-head-calm", "Calm explanation", 4, [
          "Acknowledges pain before a long question list",
          "Explains why urgent causes are being considered",
          "Avoids false reassurance",
          "Offers the patient a moment to ask a question",
        ]),
      ]),
      domain("dom-head-ed", "Patient education", [
        skill("sk-head-ed", "Warning signs", 4, ["Names one reason to seek emergency care"]),
      ]),
      domain("dom-head-pro", "Professionalism", [
        skill("sk-head-pro", "Manner", 4, []),
      ]),
    ],
  },
  {
    id: "bp-chest",
    title: "Chest pain OSCE",
    scenario: "chest_pain",
    caseType: "osce",
    level: "Y3",
    vignette:
      "A 58-year-old in the emergency department has had pressure in the chest for forty minutes. A nurse is present. Lead the first assessment.",
    updatedAt: "2026-10-02",
    narratives: [],
    domains: [
      domain("dom-chest-hx", "History", [
        skill("sk-chest-hpi", "Character of pain", 4, [
          "!Asks about exertional or rest onset",
          "Asks about radiation",
          "Asks about shortness of breath, sweat, or nausea",
          "Asks about cardiac risk factors",
        ]),
      ]),
      domain("dom-chest-px", "Physical examination", [
        skill("sk-chest-px", "Focused exam", 4, ["Listens to heart and lungs"]),
      ]),
      domain("dom-chest-rs", "Clinical reasoning", [
        skill("sk-chest-ddx", "Dangerous causes", 4, [
          "!Includes acute coronary syndrome",
          "Includes pulmonary embolism when the story fits",
          "Includes aortic dissection when the story fits",
          "Says which test or action comes first",
          "States who needs to be called",
        ]),
        skill("sk-chest-acuity", "Acuity statement", 4, [
          "Says whether the patient is stable",
          "Names a monitoring step",
          "Avoids sending the patient away for a non-urgent test first",
          "Repeats the acuity judgment after new information",
        ]),
      ]),
      domain("dom-chest-com", "Communication", [
        skill("sk-chest-com", "Clear updates", 4, [
          "Tells the patient what is happening now",
          "Uses plain language for the leading concern",
        ]),
      ]),
      domain("dom-chest-ed", "Patient education", [skill("sk-chest-ed", "Follow-up teaching", 4, [])]),
      domain("dom-chest-pro", "Professionalism", [
        skill("sk-chest-pro", "Team and respect", 4, [
          "Introduces the team role",
          "Speaks to the patient rather than only about them",
          "Keeps the patient informed during pauses",
          "Hands off with a clear concern and plan",
        ]),
      ]),
    ],
  },
  {
    id: "bp-head-ref",
    title: "Headache reflection",
    scenario: "headache",
    caseType: "reflection",
    level: "Y1",
    vignette:
      "After the headache session, write about one choice you made while taking the history and what you would change next time.",
    updatedAt: "2026-09-18",
    narratives: [
      {
        id: "nar-ref-1",
        title: "Coach note on a specific moment",
        tone: "balanced",
        body: "Name the moment you felt unsure, what you said next, and one question you would add. A reflection that stays this specific is more useful than a general promise to be more thorough.",
      },
    ],
    domains: [
      domain("dom-ref-hx", "History", [
        skill("sk-ref-hx", "What I asked", 2, ["Names one question that was skipped"]),
      ]),
      domain("dom-ref-rs", "Clinical reasoning", [
        skill("sk-ref-unc", "Uncertainty", 2, [
          "Describes a specific moment of uncertainty",
          "Says what information was missing",
          "Connects the moment to one diagnosis that had to be considered",
        ]),
      ]),
      domain("dom-ref-com", "Communication", [
        skill("sk-ref-next", "What to say differently", 2, [
          "Writes the sentence they would use next time",
          "Says how they would check the patient's understanding",
        ]),
      ]),
    ],
  },
  {
    id: "bp-dyspnea",
    title: "Shortness of breath observation",
    scenario: "dyspnea",
    caseType: "direct_observation",
    level: "Y3",
    vignette:
      "On the ward, a patient admitted overnight is more short of breath this morning. A nurse asks you to take a first look.",
    updatedAt: "2026-10-08",
    narratives: [],
    domains: [
      domain("dom-dys-hx", "History", [
        skill("sk-dys-hx", "Interval history", 3, [
          "Asks what changed since admission",
          "Asks about chest pain",
          "Asks about leg swelling or a new cough",
        ]),
      ]),
      domain("dom-dys-px", "Physical examination", [
        skill("sk-dys-px", "Bedside exam", 3, [
          "Counts or comments on the respiratory rate",
          "Listens to the lungs",
          "Looks for distress while the patient speaks",
        ]),
      ]),
      domain("dom-dys-rs", "Clinical reasoning", [
        skill("sk-dys-rs", "Next step", 3, [
          "Names one dangerous cause",
          "States the immediate next action",
        ]),
      ]),
      domain("dom-dys-com", "Communication", [
        skill("sk-dys-com", "Updates the nurse and patient", 3, [
          "Tells the patient what they are checking",
          "Closes the loop with the nurse",
          "States the concern in one sentence",
          "Asks the nurse what they have already noticed",
        ]),
      ]),
      domain("dom-dys-pro", "Professionalism", [
        skill("sk-dys-pro", "Help-seeking", 3, [
          "Asks for help when the patient looks worse",
          "States the concern when calling for help",
          "Stays with the task until it is handed off",
        ]),
      ]),
      domain("dom-dys-ed", "Patient education", [
        skill("sk-dys-ed", "What happens next", 3, ["Tells the patient the immediate next step"]),
      ]),
    ],
  },
  {
    id: "bp-fatigue",
    title: "Fatigue reflection",
    scenario: "fatigue",
    caseType: "reflection",
    level: "Y1",
    vignette: "Write about a visit for fatigue. This blueprint is intentionally thin so the coverage board shows a gap.",
    updatedAt: "2026-08-01",
    narratives: [],
    domains: [
      domain("dom-fat-hx", "History", [skill("sk-fat-hx", "History choices", 2, [])]),
      domain("dom-fat-rs", "Clinical reasoning", [
        skill("sk-fat-rs", "What I concluded", 2, ["Names one diagnosis that was considered"]),
      ]),
    ],
  },
  {
    id: "bp-dizzy",
    title: "Dizziness OSCE",
    scenario: "dizziness",
    caseType: "osce",
    level: "Y2",
    vignette: "A 70-year-old feels as if the room is spinning when they roll over in bed. Begin the visit.",
    updatedAt: "2026-10-11",
    narratives: [
      {
        id: "nar-dizzy-1",
        title: "Separate vertigo from lightheadedness",
        tone: "balanced",
        body: "Ask the patient to describe the sensation in their own words before you name it. Separate a spinning sensation from lightheadedness, and ask about hearing change and neurologic symptoms. Explain each bedside test before you begin.",
      },
    ],
    domains: [
      domain("dom-diz-hx", "History", [
        skill("sk-diz-hx", "Character of dizziness", 4, [
          "Asks whether the sensation is spinning",
          "Asks about hearing change",
        ]),
      ]),
      domain("dom-diz-px", "Physical examination", [skill("sk-diz-px", "Bedside tests", 4, [])]),
      domain("dom-diz-com", "Communication", [
        skill("sk-diz-com", "Explanation", 4, [
          "Asks the patient to describe the feeling in their own words",
          "Explains each test before starting it",
          "Paces questions so the patient can answer",
          "Summarizes what was heard",
        ]),
      ]),
      domain("dom-diz-pro", "Professionalism", [
        skill("sk-diz-pro", "Safety during the exam", 4, [
          "Supports the patient before a positional test",
          "Watches for distress and pauses",
          "Explains that nausea can happen",
          "Does not leave the patient unsteady",
        ]),
      ]),
    ],
  },
];

function person(partial: Person): Person {
  return partial;
}

const people: Person[] = [
  person({
    id: "p-shah",
    name: "Amira Shah",
    email: "amira.shah@school.edu",
    roles: ["admin", "assessment_educator", "feedback_giver"],
    giverKinds: ["assessment_educator"],
    gender: "Woman",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "Faculty",
    level: "Y4",
  }),
  person({
    id: "p-ellis",
    name: "Jonah Ellis",
    email: "jonah.ellis@school.edu",
    roles: ["assessment_educator", "feedback_giver"],
    giverKinds: ["assessment_educator"],
    gender: "Man",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "Faculty",
    level: "Y4",
  }),
  person({
    id: "p-raman",
    name: "Priya Raman",
    email: "priya.raman@school.edu",
    roles: ["feedback_giver"],
    giverKinds: ["faculty"],
    gender: "Woman",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "Faculty",
    level: "Y4",
  }),
  person({
    id: "p-dalton",
    name: "Chris Dalton",
    email: "chris.dalton@school.edu",
    roles: ["feedback_giver"],
    giverKinds: ["faculty"],
    gender: "Man",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "Faculty",
    level: "Y4",
  }),
  person({
    id: "p-lee",
    name: "Morgan Lee",
    email: "morgan.lee@school.edu",
    roles: ["feedback_giver"],
    giverKinds: ["standardized_patient"],
    gender: "Nonbinary",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "Faculty",
    level: "Y4",
  }),
  person({
    id: "p-wallace",
    name: "Andre Wallace",
    email: "andre.wallace@school.edu",
    roles: ["student", "feedback_giver"],
    giverKinds: ["upper_class_peer"],
    gender: "Man",
    race: "Black or African American",
    ethnicity: "Not Hispanic or Latino",
    urim: true,
    cohort: "2027",
    level: "Y4",
  }),
  person({
    id: "p-maya",
    name: "Maya Chen",
    email: "maya.chen@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2027",
    level: "Y4",
  }),
  person({
    id: "p-luis",
    name: "Luis Ortega",
    email: "luis.ortega@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Man",
    race: "White",
    ethnicity: "Hispanic or Latino",
    urim: true,
    cohort: "2027",
    level: "Y4",
  }),
  person({
    id: "p-helen",
    name: "Helen Brooks",
    email: "helen.brooks@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2027",
    level: "Y4",
  }),
  person({
    id: "p-noah",
    name: "Noah Patel",
    email: "noah.patel@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Man",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2028",
    level: "Y3",
  }),
  person({
    id: "p-imani",
    name: "Imani Adeyemi",
    email: "imani.adeyemi@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Black or African American",
    ethnicity: "Not Hispanic or Latino",
    urim: true,
    cohort: "2028",
    level: "Y3",
  }),
  person({
    id: "p-sam",
    name: "Sam Reyes",
    email: "sam.reyes@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Nonbinary",
    race: "Two or more races",
    ethnicity: "Hispanic or Latino",
    urim: true,
    cohort: "2028",
    level: "Y3",
  }),
  person({
    id: "p-grace",
    name: "Grace Okonkwo",
    email: "grace.okonkwo@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Black or African American",
    ethnicity: "Not Hispanic or Latino",
    urim: true,
    cohort: "2028",
    level: "Y3",
  }),
  person({
    id: "p-elena",
    name: "Elena Vasquez",
    email: "elena.vasquez@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "White",
    ethnicity: "Hispanic or Latino",
    urim: true,
    cohort: "2029",
    level: "Y2",
  }),
  person({
    id: "p-jordan",
    name: "Jordan Kim",
    email: "jordan.kim@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Man",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2029",
    level: "Y2",
  }),
  person({
    id: "p-avery",
    name: "Avery Singh",
    email: "avery.singh@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2029",
    level: "Y2",
  }),
  person({
    id: "p-miles",
    name: "Miles Carter",
    email: "miles.carter@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Man",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2029",
    level: "Y2",
  }),
  person({
    id: "p-meera",
    name: "Meera Nair",
    email: "meera.nair@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Asian",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2030",
    level: "Y1",
  }),
  person({
    id: "p-caleb",
    name: "Caleb Wright",
    email: "caleb.wright@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Man",
    race: "White",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2030",
    level: "Y1",
  }),
  person({
    id: "p-rosa",
    name: "Rosa Nguyen",
    email: "rosa.nguyen@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Woman",
    race: "Two or more races",
    ethnicity: "Not Hispanic or Latino",
    urim: false,
    cohort: "2030",
    level: "Y1",
  }),
  person({
    id: "p-quinn",
    name: "Quinn Alvarez",
    email: "quinn.alvarez@school.edu",
    roles: ["student"],
    giverKinds: [],
    gender: "Prefer not to say",
    race: "Prefer not to say",
    ethnicity: "Prefer not to say",
    urim: false,
    cohort: "2030",
    level: "Y1",
  }),
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

const YEAR_BASE: Record<Level, number> = { Y1: 70, Y2: 75, Y3: 80, Y4: 84 };
const DOMAIN_OFFSET: Record<string, number> = {
  History: 2,
  "Physical examination": 0,
  "Clinical reasoning": -1,
  Communication: 3,
  "Osteopathic examination": -2,
  Professionalism: 4,
  "Patient education": 1,
};

function levelFor(gradYear: number, yearStart: number): Level | null {
  const map: Record<number, Level> = { 4: "Y1", 3: "Y2", 2: "Y3", 1: "Y4" };
  return map[gradYear - yearStart] ?? null;
}

function makeCases() {
  const osce = buildCoverage(blueprints, { caseType: "osce", level: "all" });
  const reflection = buildCoverage(blueprints, { caseType: "reflection", level: "all" });

  const fromScenario = (
    model: ReturnType<typeof buildCoverage>,
    scenario: Blueprint["scenario"],
    title: string,
    stem: string,
    level: Level,
    cohorts: string[],
    blueprintId: string,
  ) => {
    const all = model.skills.filter((skillRow) => skillRow.scenario === scenario);
    const ready = all.filter((skillRow) => skillRow.status === "ready");
    return developCase({
      title,
      stem,
      level,
      scenario,
      caseType: model.cells[0]?.caseType ?? "osce",
      skills: ready,
      blueprintId,
      omittedSkillCount: all.length - ready.length,
      assignedCohorts: cohorts,
    });
  };

  const abdominal = fromScenario(
    osce,
    "abdominal_pain",
    "Abdominal pain station — primary care",
    blueprints[0].vignette,
    "Y2",
    ["2029"],
    "bp-abd",
  );
  const back = fromScenario(
    osce,
    "back_pain",
    "Back pain station — office visit",
    blueprints[1].vignette,
    "Y3",
    ["2028"],
    "bp-back",
  );
  const headache = fromScenario(
    reflection,
    "headache",
    "Headache clinic reflection",
    blueprints.find((bp) => bp.id === "bp-head-ref")?.vignette ?? "",
    "Y1",
    ["2030"],
    "bp-head-ref",
  );
  abdominal.createdAt = "2026-10-28T15:00:00.000Z";
  back.createdAt = "2026-10-29T15:00:00.000Z";
  headache.createdAt = "2026-10-30T15:00:00.000Z";
  abdominal.status = "active";
  back.status = "pilot";
  headache.status = "active";
  return [abdominal, back, headache];
}

function flatItems(domains: Domain[]) {
  return domains.flatMap((d) =>
    d.skills.flatMap((s) => s.items.map((item) => ({ item, skillName: s.name, domainName: d.name }))),
  );
}

export function createSeed(): AppState {
  const cases = makeCases();
  const students = people.filter((p) => p.roles.includes("student"));
  const scores: AppState["scores"] = [];
  let scoreN = 0;

  for (const student of students) {
    const grad = Number(student.cohort);
    const offset = (hash(student.id) % 9) - 4;
    for (const yearStart of [2023, 2024, 2025, 2026]) {
      const trainingYear = levelFor(grad, yearStart);
      if (!trainingYear) continue;
      for (const domainName of CANONICAL_DOMAINS) {
        const noise = (hash(`${student.id}|${domainName}|${yearStart}`) % 7) - 3;
        scores.push({
          id: `score-${scoreN++}`,
          studentId: student.id,
          caseId: null,
          domainName,
          trainingYear,
          date: `${yearStart}-10-15`,
          score: clamp(
            YEAR_BASE[trainingYear] + offset + (DOMAIN_OFFSET[domainName] ?? 0) + noise,
            58,
            96,
          ),
        });
      }
    }
  }

  for (const developed of cases) {
    for (const student of students) {
      if (!developed.assignedCohorts.includes(student.cohort)) continue;
      const offset = (hash(student.id + developed.id) % 9) - 4;
      for (const d of developed.domains) {
        const noise = (hash(`${student.id}|${developed.id}|${d.name}`) % 7) - 3;
        scores.push({
          id: `score-${scoreN++}`,
          studentId: student.id,
          caseId: developed.id,
          domainName: d.name,
          trainingYear: student.level,
          date: "2026-10-20",
          score: clamp(YEAR_BASE[student.level] + offset + (DOMAIN_OFFSET[d.name] ?? 0) + noise, 58, 96),
        });
      }
    }
  }

  const abd = cases[0];
  const head = cases[2];
  const abdItems = flatItems(abd.domains);
  const headItems = flatItems(head.domains);

  const markSome = (
    rows: ReturnType<typeof flatItems>,
    pattern: Array<"met" | "not_met" | "not_observed">,
  ): FeedbackEntry["marks"] =>
    rows.slice(0, pattern.length).map((row, index) => ({
      itemId: row.item.id,
      itemText: row.item.text,
      skillName: row.skillName,
      domainName: row.domainName,
      mark: pattern[index],
    }));

  const feedback: FeedbackEntry[] = [
    {
      id: "fb-1",
      caseId: abd.id,
      studentId: "p-elena",
      giverId: "p-raman",
      mode: "speech",
      transcript:
        "You set a clear agenda and asked permission before the exam. The pain history covered location and severity. Timing and meals were thin. The differential was narrow and did not mention ectopic pregnancy. Empathy when Elena described the pain was genuine.",
      marks: markSome(abdItems, ["met", "not_met", "met", "met", "not_met", "met"]),
      createdAt: "2026-11-02T18:00:00.000Z",
    },
    {
      id: "fb-2",
      caseId: abd.id,
      studentId: "p-elena",
      giverId: "p-lee",
      mode: "recording",
      transcript:
        "I understood the exam and you kept me covered. The questions felt fast, and I did not get to say what worried me. I left unsure whether I should go to the emergency department.",
      marks: markSome(abdItems, ["met", "met", "not_observed", "not_met", "met", "not_met"]),
      createdAt: "2026-11-03T18:00:00.000Z",
      narrativeTitle: "Standardized patient: felt rushed at the end",
    },
    {
      id: "fb-3",
      caseId: abd.id,
      studentId: "p-elena",
      giverId: "p-wallace",
      mode: "upload",
      attachmentName: "peer-note-elena.txt",
      transcript:
        "Your exam sequence was organized and you examined the painful area last. Consider one sentence of safety-netting before you leave the room. The introduction was clear.",
      marks: markSome(abdItems, ["met", "met", "met", "not_met", "met"]),
      createdAt: "2026-11-04T18:00:00.000Z",
    },
    {
      id: "fb-4",
      caseId: abd.id,
      studentId: "p-jordan",
      giverId: "p-dalton",
      mode: "revised_narrative",
      narrativeTitle: "History was organized, the differential was narrow",
      transcript:
        "Jordan, the history was organized and the exam was respectful. Please add pregnancy and bleeding to the red-flag questions, and state one warning sign before the visit ends.",
      marks: markSome(abdItems, ["met", "not_met", "met", "not_met"]),
      createdAt: "2026-11-05T18:00:00.000Z",
    },
    {
      id: "fb-5",
      caseId: head.id,
      studentId: "p-meera",
      giverId: "p-ellis",
      mode: "speech",
      transcript:
        "You described a specific moment when you skipped the sudden-onset question. The sentence you would use next time is clear. This is a strong reflection because it stays on one choice.",
      marks: markSome(headItems, ["met", "met", "met", "met"]),
      createdAt: "2026-11-01T18:00:00.000Z",
    },
  ];

  const syntheses: AppState["syntheses"] = [];
  const pairs = new Set(feedback.map((entry) => `${entry.caseId}|${entry.studentId}`));
  for (const pair of pairs) {
    const [caseId, studentId] = pair.split("|");
    const developed = cases.find((c) => c.id === caseId);
    const student = people.find((p) => p.id === studentId);
    if (!developed || !student) continue;
    const built = synthesize({
      entries: feedback.filter((entry) => entry.caseId === caseId && entry.studentId === studentId),
      student,
      developed,
      givers: people,
    });
    if (!built) continue;
    syntheses.push({ ...built, id: `syn-${caseId}-${studentId}`, createdAt: "2026-11-06T18:00:00.000Z" });
  }

  return {
    people,
    blueprints,
    cases,
    feedback,
    syntheses,
    scores,
    portfolios: [
      {
        studentId: "p-elena",
        statement:
          "This term I am working on closing the visit: one warning sign, in plain language, before I leave the room. The abdominal pain station showed that my exam sequence is steadier than my differential.",
        compiledAt: "2026-11-06",
      },
      {
        studentId: "p-meera",
        statement:
          "I want my reflections to name one missed question and the sentence I will use next time, instead of promising to be more thorough in general.",
        compiledAt: "2026-11-06",
      },
    ],
    activeRole: "assessment_educator",
    activePersonId: "p-shah",
    page: "coverage",
    focus: {},
  };
}

export const SAMPLE_NOTE = `Sample classes, cases, and scores for ${scenarioLabel("abdominal_pain").toLowerCase()} and the other common presentations. Saved edits stay in this browser.`;

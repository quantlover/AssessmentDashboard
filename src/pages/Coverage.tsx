import { useMemo, useState } from "react";
import { CASE_TYPES, DEFAULT_TARGET, LEVELS, caseTypeLabel, levelLabel, scenarioLabel, shortDomain } from "../constants";
import { blankBlueprint, buildCoverage, cellAt, developCase, statusLabel, type DomainCoverage, type SkillCoverage } from "../coverage";
import { cx, uid } from "../ids";
import { useApp } from "../store";
import type { CaseType, Level, ScenarioId } from "../types";
import { Field, Meter, Modal, Pill } from "../ui";

export function CoveragePage() {
  const { state, dispatch, toast } = useApp();
  const [caseType, setCaseType] = useState<CaseType>("osce");
  const [level, setLevel] = useState<Level | "all">("all");
  const [view, setView] = useState<"matrix" | "list">("matrix");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [skillFilter, setSkillFilter] = useState<"all" | "ready" | "thin" | "empty">("all");
  const [developOpen, setDevelopOpen] = useState(false);

  const model = useMemo(
    () => buildCoverage(state.blueprints, { caseType, level }),
    [state.blueprints, caseType, level],
  );

  const selected = model.cells.find((cell) => cell.key === selectedKey) ?? null;
  const pickedSkills = model.skills.filter((skill) => picked.includes(skill.key));
  const scenarios = [...new Set(pickedSkills.map((skill) => skill.scenario))];
  const sameScenario = scenarios.length === 1;

  const counts = {
    ready: model.skills.filter((s) => s.status === "ready").length,
    thin: model.skills.filter((s) => s.status === "thin").length,
    empty: model.skills.filter((s) => s.status === "empty").length,
    open: model.cells.filter((c) => c.status === "open").length,
    developable: model.cells.filter((c) => c.readySkillCount > 0).length,
  };

  const readyCells = model.cells
    .filter((cell) => cell.readySkillCount > 0)
    .sort((a, b) => b.readySkillCount - a.readySkillCount || a.scenario.localeCompare(b.scenario));

  function resetSelection() {
    setPicked([]);
    setSelectedKey(null);
  }

  function toggleSkill(key: string) {
    setPicked((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function selectReadyIn(cell: DomainCoverage) {
    const keys = cell.skills.filter((skill) => skill.status === "ready").map((skill) => skill.key);
    setPicked((current) => [...new Set([...current, ...keys])]);
    setSelectedKey(cell.key);
  }

  function startBlueprint(scenario: ScenarioId, domainName?: string) {
    const blueprint = blankBlueprint({
      scenario,
      caseType,
      level: level === "all" ? "Y2" : level,
      title: `${scenarioLabel(scenario)} · ${caseTypeLabel(caseType)}`,
      domains: domainName
        ? [
            {
              id: uid("dom"),
              name: domainName,
              skills: [
                {
                  id: uid("skill"),
                  name: "New skill",
                  targetItems: DEFAULT_TARGET[caseType],
                  items: [],
                },
              ],
            },
          ]
        : undefined,
    });
    dispatch({ type: "save-blueprint", blueprint });
    dispatch({ type: "go", page: "studio", focus: { blueprintId: blueprint.id } });
    toast("Blueprint started. Add checklist items until the skill reaches its target.");
  }

  const listed = model.skills
    .filter((skill) => (skillFilter === "all" ? true : skill.status === skillFilter))
    .slice()
    .sort((a, b) => {
      const statusDelta = ["empty", "thin", "ready"].indexOf(a.status) - ["empty", "thin", "ready"].indexOf(b.status);
      return statusDelta || a.scenario.localeCompare(b.scenario) || a.domainName.localeCompare(b.domainName);
    });

  return (
    <div className="stack">
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Case type">
          {CASE_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={cx("chip", caseType === type.id && "on")}
              title={type.hint}
              onClick={() => {
                setCaseType(type.id);
                resetSelection();
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
        <label className="inline-field">
          <span>Learner level</span>
          <select
            value={level}
            onChange={(event) => {
              setLevel(event.target.value as Level | "all");
              resetSelection();
            }}
          >
            <option value="all">All years</option>
            {LEVELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="chips" role="group" aria-label="View">
          <button type="button" className={cx("chip", view === "matrix" && "on")} onClick={() => setView("matrix")}>
            Matrix
          </button>
          <button type="button" className={cx("chip", view === "list" && "on")} onClick={() => setView("list")}>
            Skill list
          </button>
        </div>
        <p className="toolbar-note">
          A skill is ready when its checklist reaches the target. Default target is {DEFAULT_TARGET[caseType]} items for{" "}
          {caseTypeLabel(caseType).toLowerCase()}.
        </p>
      </div>

      <div className="stats">
        <Stat n={counts.developable} label="Combinations ready to develop" />
        <Stat n={counts.ready} label="Skills with enough items" />
        <Stat n={counts.thin} label="Skills still short" />
        <Stat n={counts.empty} label="Skills with no items" />
        <Stat n={counts.open} label="Combinations not started" />
      </div>

      {readyCells.length > 0 ? (
        <section className="panel">
          <header className="panel-head">
            <h2>Enough to develop a case</h2>
            <p>These scenario and domain combinations already contain ready skills for {caseTypeLabel(caseType).toLowerCase()}.</p>
          </header>
          <div className="ready-row">
            {readyCells.map((cell) => (
              <button key={cell.key} type="button" className="ready-card" onClick={() => selectReadyIn(cell)}>
                <strong>
                  {scenarioLabel(cell.scenario)} · {shortDomain(cell.domainName)}
                </strong>
                <span>
                  {cell.readySkillCount} of {cell.skills.length} skills ready · {cell.itemCount} items
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel">
          <p className="quiet">No skill in this filter has reached its item target yet. Open a cell and add items in the studio.</p>
        </section>
      )}

      {view === "matrix" ? (
        <div className="matrix-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Scenario</th>
                {model.domainNames.map((domain) => (
                  <th key={domain} title={domain}>
                    {shortDomain(domain)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(["abdominal_pain", "back_pain", "headache", "chest_pain", "dyspnea", "dizziness", "fatigue", "joint_pain"] as ScenarioId[]).map(
                (scenario) => (
                  <tr key={scenario}>
                    <th>{scenarioLabel(scenario)}</th>
                    {model.domainNames.map((domain) => {
                      const cell = cellAt(model, scenario, domain);
                      if (!cell) return <td key={domain} />;
                      return (
                        <td key={domain}>
                          <button
                            type="button"
                            className={cx("cell", `is-${cell.status}`, selectedKey === cell.key && "is-selected")}
                            onClick={() => setSelectedKey(cell.key)}
                            aria-pressed={selectedKey === cell.key}
                            aria-label={`${scenarioLabel(scenario)}, ${domain}, ${statusLabel(cell.status)}, ${cell.readySkillCount} of ${cell.skills.length} skills ready`}
                          >
                            <CellBody cell={cell} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stack">
          <div className="chips" role="group" aria-label="Skill status">
            {(["all", "empty", "thin", "ready"] as const).map((item) => (
              <button key={item} type="button" className={cx("chip", skillFilter === item && "on")} onClick={() => setSkillFilter(item)}>
                {item === "all" ? "All skills" : statusLabel(item)}
              </button>
            ))}
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th />
                  <th>Status</th>
                  <th>Scenario</th>
                  <th>Domain</th>
                  <th>Skill</th>
                  <th>Items</th>
                  <th>Blueprint</th>
                </tr>
              </thead>
              <tbody>
                {listed.map((skill) => (
                  <tr key={skill.key}>
                    <td>
                      <input
                        type="checkbox"
                        checked={picked.includes(skill.key)}
                        disabled={skill.status !== "ready"}
                        aria-label={`Select ${skill.skillName}`}
                        onChange={() => toggleSkill(skill.key)}
                      />
                    </td>
                    <td>
                      <Pill tone={skill.status}>{statusLabel(skill.status)}</Pill>
                    </td>
                    <td>{scenarioLabel(skill.scenario)}</td>
                    <td>{skill.domainName}</td>
                    <td>{skill.skillName}</td>
                    <td>
                      {skill.itemCount}/{skill.target}
                    </td>
                    <td>{skill.blueprintTitles.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section className="panel" aria-live="polite">
        {selected ? (
          <Inspector
            cell={selected}
            picked={picked}
            onToggle={toggleSkill}
            onUseReady={() => selectReadyIn(selected)}
            onEdit={() => {
              const id = selected.skills[0]?.blueprintIds[0];
              if (!id) {
                startBlueprint(selected.scenario, selected.domainName);
                return;
              }
              dispatch({ type: "go", page: "studio", focus: { blueprintId: id } });
            }}
            onStart={() => startBlueprint(selected.scenario, selected.domainName)}
          />
        ) : (
          <div className="panel-head">
            <h2>Combination detail</h2>
            <p>Select a cell to see the skills inside that scenario and domain, then develop a case from the skills that already have enough items.</p>
          </div>
        )}
      </section>

      {pickedSkills.length > 0 ? (
        <div className="selection-bar">
          <div>
            <strong>
              {pickedSkills.length} ready {pickedSkills.length === 1 ? "skill" : "skills"} selected
            </strong>
            <span>
              {sameScenario
                ? scenarioLabel(scenarios[0])
                : "Select skills from one scenario to develop a single case."}
            </span>
          </div>
          <div className="row-actions">
            <button type="button" className="btn ghost" onClick={() => setPicked([])}>
              Clear
            </button>
            <button type="button" className="btn primary" disabled={!sameScenario} onClick={() => setDevelopOpen(true)}>
              Develop case
            </button>
          </div>
        </div>
      ) : null}

      {developOpen && sameScenario ? (
        <DevelopDialog
          skills={pickedSkills}
          caseType={caseType}
          onClose={() => setDevelopOpen(false)}
          onCreate={(developed) => {
            dispatch({ type: "save-case", developed });
            dispatch({ type: "go", page: "cases", focus: { caseId: developed.id } });
            setDevelopOpen(false);
            setPicked([]);
            toast(`Draft case “${developed.title}” is ready to assign.`);
          }}
        />
      ) : null}

      <p className="legend">
        <Pill tone="ready">Enough items</Pill>
        <Pill tone="mixed">Some skills ready</Pill>
        <Pill tone="thin">Needs items</Pill>
        <Pill tone="empty">No items yet</Pill>
        <Pill tone="open">No blueprint</Pill>
        <span>Checklist items sit inside skills, skills inside domains, domains inside a case.</span>
      </p>
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="stat">
      <strong>{n}</strong>
      <span>{label}</span>
    </div>
  );
}

function CellBody({ cell }: { cell: DomainCoverage }) {
  if (cell.status === "open") return <span className="cell-kicker">Start blueprint</span>;
  return (
    <>
      <span className="cell-count">
        {cell.readySkillCount}
        <small>/{cell.skills.length || 0}</small>
      </span>
      <span className="cell-kicker">{cell.itemCount} items</span>
    </>
  );
}

function Inspector({
  cell,
  picked,
  onToggle,
  onUseReady,
  onEdit,
  onStart,
}: {
  cell: DomainCoverage;
  picked: string[];
  onToggle: (key: string) => void;
  onUseReady: () => void;
  onEdit: () => void;
  onStart: () => void;
}) {
  return (
    <>
      <header className="panel-head">
        <div>
          <h2>
            {scenarioLabel(cell.scenario)} · {cell.domainName}
          </h2>
          <p>
            {statusLabel(cell.status)}. {cell.readySkillCount} of {cell.skills.length} skills have enough items.
          </p>
        </div>
        <div className="row-actions">
          {cell.status === "open" ? (
            <button type="button" className="btn primary" onClick={onStart}>
              Start blueprint
            </button>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={onEdit}>
                Edit blueprint
              </button>
              <button type="button" className="btn primary" disabled={cell.readySkillCount === 0} onClick={onUseReady}>
                Use ready skills
              </button>
            </>
          )}
        </div>
      </header>
      {cell.skills.length === 0 ? (
        <p className="quiet">No domain blueprint yet for this combination. Starting one adds the domain with an empty skill.</p>
      ) : (
        <div className="skill-grid">
          {cell.skills.map((skill) => (
            <article key={skill.key} className={cx("skill-card", `is-${skill.status}`)}>
              <header>
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={picked.includes(skill.key)}
                    disabled={skill.status !== "ready"}
                    onChange={() => onToggle(skill.key)}
                  />
                  <strong>{skill.skillName}</strong>
                </label>
                <Pill tone={skill.status}>{statusLabel(skill.status)}</Pill>
              </header>
              <p className="meter-line">
                <Meter value={skill.itemCount} max={skill.target} />
                <span>
                  {skill.itemCount} of {skill.target} items
                </span>
              </p>
              {skill.items.length > 0 ? (
                <ul>
                  {skill.items.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      {item.critical ? <em>Critical</em> : null}
                      {item.text}
                    </li>
                  ))}
                  {skill.items.length > 4 ? <li className="more">+{skill.items.length - 4} more</li> : null}
                </ul>
              ) : (
                <p className="quiet">No checklist items yet.</p>
              )}
              <p className="quiet">In {skill.blueprintTitles.join(", ")}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function DevelopDialog({
  skills,
  caseType,
  onClose,
  onCreate,
}: {
  skills: SkillCoverage[];
  caseType: CaseType;
  onClose: () => void;
  onCreate: (developed: ReturnType<typeof developCase>) => void;
}) {
  const { state } = useApp();
  const scenario = skills[0].scenario;
  const domainNames = [...new Set(skills.map((skill) => skill.domainName))];
  const blueprint = state.blueprints.find((bp) => skills.every((skill) => skill.blueprintIds.includes(bp.id))) ?? state.blueprints.find((bp) => skills[0].blueprintIds.includes(bp.id));
  const cohorts = [...new Set(state.people.filter((p) => p.roles.includes("student")).map((p) => p.cohort))].filter((c) => c !== "Faculty").sort();
  const [title, setTitle] = useState(`${scenarioLabel(scenario)} ${CASE_TYPES.find((t) => t.id === caseType)?.label ?? ""} — ${domainNames.join(", ")}`);
  const [stem, setStem] = useState(blueprint?.vignette ?? "");
  const [level, setLevel] = useState<Level>(blueprint?.level ?? "Y2");
  const matchingCohorts = [
    ...new Set(
      state.people
        .filter((person) => person.roles.includes("student") && person.level === (blueprint?.level ?? "Y2"))
        .map((person) => person.cohort),
    ),
  ];
  const [assigned, setAssigned] = useState<string[]>(matchingCohorts.length > 0 ? matchingCohorts : cohorts.slice(0, 1));

  const allInScenario = buildCoverage(state.blueprints, { caseType, level: "all" }).skills.filter(
    (skill) => skill.scenario === scenario,
  );

  return (
    <Modal
      title="Develop a case"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() =>
              onCreate(
                developCase({
                  title,
                  stem,
                  level,
                  scenario,
                  caseType,
                  skills,
                  blueprintId: blueprint?.id ?? null,
                  omittedSkillCount: allInScenario.filter((skill) => skill.status !== "ready").length,
                  assignedCohorts: assigned,
                }),
              )
            }
          >
            Create draft case
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Case title">
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Learner level" hint="OMS / MS year">
          <select value={level} onChange={(event) => setLevel(event.target.value as Level)}>
            {LEVELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Opening stem" hint="What the learner sees at the door">
          <textarea rows={4} value={stem} onChange={(event) => setStem(event.target.value)} />
        </Field>
      </div>
      <fieldset className="checks">
        <legend>Assign to class</legend>
        {cohorts.map((cohort) => (
          <label key={cohort}>
            <input
              type="checkbox"
              checked={assigned.includes(cohort)}
              onChange={() =>
                setAssigned((current) =>
                  current.includes(cohort) ? current.filter((item) => item !== cohort) : [...current, cohort],
                )
              }
            />
            Class of {cohort}
          </label>
        ))}
      </fieldset>
      <h3 className="subhead">Included because these skills have enough items</h3>
      <ul className="plain-list">
        {skills.map((skill) => (
          <li key={skill.key}>
            <strong>{skill.domainName}</strong> · {skill.skillName} · {skill.itemCount} items
          </li>
        ))}
      </ul>
      <p className="quiet">
        Skills in {scenarioLabel(scenario)} that are still short of the target stay in the blueprint and are left out of this case.
        You can add items and develop another case later. {levelLabel(level)} is the learner level stored on the case.
      </p>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import { CASE_TYPES, DEFAULT_TARGET, LEVELS, SCENARIOS, caseTypeLabel, levelLabel, scenarioLabel } from "../constants";
import { rekeyBlueprint } from "../coverage";
import { clone, cx, uid } from "../ids";
import { OUTLINE_EXAMPLE, parseOutline } from "../outline";
import { useApp } from "../store";
import type { Blueprint, CaseType, Level, Narrative, ScenarioId } from "../types";
import { Field, Meter, Modal, Pill } from "../ui";

export function StudioPage() {
  const { state, dispatch, toast } = useApp();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(state.focus.blueprintId ?? state.blueprints[0]?.id ?? "");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (state.focus.blueprintId) setSelectedId(state.focus.blueprintId);
  }, [state.focus.blueprintId]);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId]);

  const blueprint = state.blueprints.find((bp) => bp.id === selectedId) ?? null;
  const filtered = state.blueprints.filter((bp) => {
    const hay = `${bp.title} ${scenarioLabel(bp.scenario)} ${caseTypeLabel(bp.caseType)}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  function commit(recipe: (draft: Blueprint) => void) {
    if (!blueprint) return;
    const next = clone(blueprint);
    recipe(next);
    next.updatedAt = new Date().toISOString();
    dispatch({ type: "save-blueprint", blueprint: next });
  }

  function createBlank() {
    const blueprint = {
      id: uid("bp"),
      title: "New case blueprint",
      scenario: "abdominal_pain" as const,
      caseType: "osce" as const,
      level: "Y2" as const,
      vignette: "",
      domains: [
        {
          id: uid("dom"),
          name: "History",
          skills: [{ id: uid("skill"), name: "New skill", targetItems: DEFAULT_TARGET.osce, items: [] }],
        },
      ],
      narratives: [],
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "save-blueprint", blueprint });
    setSelectedId(blueprint.id);
  }

  const coverage = useMemo(() => {
    if (!blueprint) return [];
    return blueprint.domains.flatMap((domain) =>
      domain.skills.map((skill) => ({
        domain: domain.name,
        skill: skill.name,
        count: skill.items.filter((item) => item.text.trim()).length,
        target: skill.targetItems,
      })),
    );
  }, [blueprint]);

  const readyCount = coverage.filter((row) => row.count >= row.target && row.target > 0).length;

  return (
    <div className="studio">
      <aside className="editor-list">
        <div className="row-actions">
          <button type="button" className="btn primary" onClick={createBlank}>
            New blueprint
          </button>
        </div>
        <input
          className="search"
          placeholder="Search blueprints"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search blueprints"
        />
        <ul>
          {filtered.map((bp) => {
            const items = bp.domains.reduce((sum, domain) => sum + domain.skills.reduce((inner, skill) => inner + skill.items.length, 0), 0);
            return (
              <li key={bp.id}>
                <button type="button" className={cx("bp-link", bp.id === blueprint?.id && "on")} onClick={() => setSelectedId(bp.id)}>
                  <strong>{bp.title}</strong>
                  <span>
                    {scenarioLabel(bp.scenario)} · {CASE_TYPES.find((type) => type.id === bp.caseType)?.label} · {items} items
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {blueprint ? (
        <div className="editor-main">
          <div className="form-grid">
            <Field label="Blueprint title">
              <input value={blueprint.title} onChange={(event) => commit((draft) => void (draft.title = event.target.value))} />
            </Field>
            <Field label="Scenario">
              <select
                value={blueprint.scenario}
                onChange={(event) => commit((draft) => void (draft.scenario = event.target.value as ScenarioId))}
              >
                {SCENARIOS.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Case type">
              <select
                value={blueprint.caseType}
                onChange={(event) => commit((draft) => void (draft.caseType = event.target.value as CaseType))}
              >
                {CASE_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.hint}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Learner level" hint="Year 1–4, OMS or MS">
              <select value={blueprint.level} onChange={(event) => commit((draft) => void (draft.level = event.target.value as Level))}>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Opening stem" hint="Prefills the case when you develop it">
              <textarea rows={3} value={blueprint.vignette} onChange={(event) => commit((draft) => void (draft.vignette = event.target.value))} />
            </Field>
          </div>

          <div className="row-actions spread">
            <h2 className="subhead">Domains, skills, and checklist items</h2>
            <div className="row-actions">
              <button type="button" className="btn ghost" onClick={() => setPasteOpen(true)}>
                Paste outline
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() =>
                  commit((draft) => {
                    draft.domains.push({
                      id: uid("dom"),
                      name: "New domain",
                      skills: [
                        {
                          id: uid("skill"),
                          name: "New skill",
                          targetItems: DEFAULT_TARGET[draft.caseType],
                          items: [],
                        },
                      ],
                    });
                  })
                }
              >
                Add domain
              </button>
            </div>
          </div>

          <div className="outline">
            {blueprint.domains.map((domain) => (
              <section key={domain.id} className="domain-card">
                <header className="domain-head">
                  <input
                    aria-label="Domain name"
                    value={domain.name}
                    onChange={(event) =>
                      commit((draft) => {
                        const match = draft.domains.find((item) => item.id === domain.id);
                        if (match) match.name = event.target.value;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() => commit((draft) => void (draft.domains = draft.domains.filter((item) => item.id !== domain.id)))}
                  >
                    Remove domain
                  </button>
                </header>
                {domain.skills.map((skill) => {
                  const filled = skill.items.filter((item) => item.text.trim()).length;
                  const ready = filled >= skill.targetItems;
                  return (
                    <div key={skill.id} className="skill-block">
                      <div className="skill-head">
                        <input
                          aria-label="Skill name"
                          value={skill.name}
                          onChange={(event) =>
                            commit((draft) => {
                              const match = draft.domains.flatMap((item) => item.skills).find((item) => item.id === skill.id);
                              if (match) match.name = event.target.value;
                            })
                          }
                        />
                        <label className="target">
                          Enough at
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={skill.targetItems}
                            onChange={(event) =>
                              commit((draft) => {
                                const match = draft.domains.flatMap((item) => item.skills).find((item) => item.id === skill.id);
                                if (match) match.targetItems = Math.max(1, Number(event.target.value) || 1);
                              })
                            }
                          />
                        </label>
                        <Pill tone={ready ? "ready" : filled === 0 ? "empty" : "thin"}>
                          {filled}/{skill.targetItems}
                        </Pill>
                        <button
                          type="button"
                          className="btn ghost small"
                          onClick={() =>
                            commit((draft) => {
                              const parent = draft.domains.find((item) => item.id === domain.id);
                              if (parent) parent.skills = parent.skills.filter((item) => item.id !== skill.id);
                            })
                          }
                        >
                          Remove skill
                        </button>
                      </div>
                      <p className="meter-line">
                        <Meter value={filled} max={skill.targetItems} />
                        <span>{ready ? "Enough items to include this skill in a case." : "Add items until the bar fills."}</span>
                      </p>
                      <ul className="item-list">
                        {skill.items.map((item) => (
                          <li key={item.id} className="item-row">
                            <label className="checkline" title="Critical item">
                              <input
                                type="checkbox"
                                checked={item.critical}
                                onChange={(event) =>
                                  commit((draft) => {
                                    const match = draft.domains
                                      .flatMap((d) => d.skills)
                                      .flatMap((s) => s.items)
                                      .find((row) => row.id === item.id);
                                    if (!match) return;
                                    match.critical = event.target.checked;
                                    if (event.target.checked && match.points < 2) match.points = 2;
                                  })
                                }
                              />
                              <span>Critical</span>
                            </label>
                            <input
                              id={item.id}
                              aria-label="Checklist item"
                              value={item.text}
                              placeholder="What the assessor looks for"
                              onChange={(event) =>
                                commit((draft) => {
                                  const match = draft.domains
                                    .flatMap((d) => d.skills)
                                    .flatMap((s) => s.items)
                                    .find((row) => row.id === item.id);
                                  if (match) match.text = event.target.value;
                                })
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                const id = uid("item");
                                commit((draft) => {
                                  const match = draft.domains.flatMap((d) => d.skills).find((s) => s.id === skill.id);
                                  if (!match) return;
                                  const index = match.items.findIndex((row) => row.id === item.id);
                                  match.items.splice(index + 1, 0, { id, text: "", critical: false, points: 1 });
                                });
                                setFocusId(id);
                              }}
                            />
                            <label className="target tight">
                              Pts
                              <input
                                type="number"
                                min={0}
                                max={5}
                                value={item.points}
                                onChange={(event) =>
                                  commit((draft) => {
                                    const match = draft.domains
                                      .flatMap((d) => d.skills)
                                      .flatMap((s) => s.items)
                                      .find((row) => row.id === item.id);
                                    if (match) match.points = Math.max(0, Number(event.target.value) || 0);
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              className="btn ghost small"
                              onClick={() =>
                                commit((draft) => {
                                  const match = draft.domains.flatMap((d) => d.skills).find((s) => s.id === skill.id);
                                  if (match) match.items = match.items.filter((row) => row.id !== item.id);
                                })
                              }
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => {
                          const id = uid("item");
                          commit((draft) => {
                            const match = draft.domains.flatMap((d) => d.skills).find((s) => s.id === skill.id);
                            match?.items.push({ id, text: "", critical: false, points: 1 });
                          });
                          setFocusId(id);
                        }}
                      >
                        Add checklist item
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() =>
                    commit((draft) => {
                      const parent = draft.domains.find((item) => item.id === domain.id);
                      parent?.skills.push({
                        id: uid("skill"),
                        name: "New skill",
                        targetItems: DEFAULT_TARGET[draft.caseType],
                        items: [],
                      });
                    })
                  }
                >
                  Add skill
                </button>
              </section>
            ))}
          </div>

          <NarrativeBlock
            narratives={blueprint.narratives}
            onChange={(narratives) => commit((draft) => void (draft.narratives = narratives))}
          />
        </div>
      ) : (
        <div className="editor-main">
          <p>Create a blueprint to start a case plan.</p>
        </div>
      )}

      <aside className="rail">
        {blueprint ? (
          <>
            <h2>This blueprint</h2>
            <p>
              {scenarioLabel(blueprint.scenario)} · {caseTypeLabel(blueprint.caseType)} · {levelLabel(blueprint.level)}
            </p>
            <div className="stats vertical">
              <Stat n={blueprint.domains.length} label="Domains" />
              <Stat n={coverage.length} label="Skills" />
              <Stat n={coverage.reduce((sum, row) => sum + row.count, 0)} label="Checklist items" />
              <Stat n={readyCount} label="Skills ready to develop" />
            </div>
            <ul className="plain-list">
              {coverage.map((row) => (
                <li key={`${row.domain}-${row.skill}`}>
                  <span>
                    {row.domain} · {row.skill}
                  </span>
                  <Pill tone={row.count >= row.target ? "ready" : row.count === 0 ? "empty" : "thin"}>
                    {row.count}/{row.target}
                  </Pill>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const target = DEFAULT_TARGET[blueprint.caseType];
                commit((draft) => {
                  for (const domain of draft.domains) for (const skill of domain.skills) skill.targetItems = target;
                });
                toast(`Every skill in this blueprint is now enough at ${target} items.`);
              }}
            >
              Set every skill to the {caseTypeLabel(blueprint.caseType).toLowerCase()} default
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const copy = rekeyBlueprint(blueprint);
                dispatch({ type: "save-blueprint", blueprint: copy });
                setSelectedId(copy.id);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                const snapshot = clone(blueprint);
                dispatch({ type: "delete-blueprint", id: blueprint.id });
                const remaining = state.blueprints.filter((bp) => bp.id !== blueprint.id);
                setSelectedId(remaining[0]?.id ?? "");
                toast("Blueprint removed.", () => {
                  dispatch({ type: "save-blueprint", blueprint: snapshot });
                  setSelectedId(snapshot.id);
                });
              }}
            >
              Delete blueprint
            </button>
            <p className="quiet">Press Enter in an item to add the next one. Mark Critical for items a case should not omit.</p>
          </>
        ) : null}
      </aside>

      {pasteOpen && blueprint ? (
        <PasteModal
          target={DEFAULT_TARGET[blueprint.caseType]}
          onClose={() => setPasteOpen(false)}
          onApply={(domains, mode) => {
            commit((draft) => {
              draft.domains = mode === "replace" ? domains : [...draft.domains, ...domains];
            });
            setPasteOpen(false);
            toast(mode === "replace" ? "Outline replaced the domains." : "Outline added to this blueprint.");
          }}
        />
      ) : null}
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

function NarrativeBlock({
  narratives,
  onChange,
}: {
  narratives: Narrative[];
  onChange: (narratives: Narrative[]) => void;
}) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Sample feedback narratives</h2>
          <p>Feedback givers can start from one of these and revise it. Upload a text file or write it here.</p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() =>
            onChange([...narratives, { id: uid("nar"), title: "New sample narrative", body: "", tone: "balanced" }])
          }
        >
          Add narrative
        </button>
      </header>
      <div className="narrative-grid">
        {narratives.map((narrative) => (
          <article key={narrative.id} className="narrative-card">
            <input
              aria-label="Narrative title"
              value={narrative.title}
              onChange={(event) =>
                onChange(narratives.map((item) => (item.id === narrative.id ? { ...item, title: event.target.value } : item)))
              }
            />
            <select
              aria-label="Narrative tone"
              value={narrative.tone}
              onChange={(event) =>
                onChange(
                  narratives.map((item) =>
                    item.id === narrative.id ? { ...item, tone: event.target.value as Narrative["tone"] } : item,
                  ),
                )
              }
            >
              <option value="balanced">Balanced</option>
              <option value="strength">Mostly strength</option>
              <option value="growth">Mostly next step</option>
            </select>
            <textarea
              rows={5}
              aria-label="Narrative"
              value={narrative.body}
              onChange={(event) =>
                onChange(narratives.map((item) => (item.id === narrative.id ? { ...item, body: event.target.value } : item)))
              }
            />
            <div className="row-actions">
              <label className="btn ghost small file-btn">
                Upload text
                <input
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    const text = await file.text();
                    onChange(
                      narratives.map((item) =>
                        item.id === narrative.id
                          ? { ...item, body: text.slice(0, 20000), title: item.title || file.name.replace(/\.[^.]+$/, "") }
                          : item,
                      ),
                    );
                  }}
                />
              </label>
              <button type="button" className="btn ghost small" onClick={() => onChange(narratives.filter((item) => item.id !== narrative.id))}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PasteModal({
  target,
  onClose,
  onApply,
}: {
  target: number;
  onClose: () => void;
  onApply: (domains: Blueprint["domains"], mode: "append" | "replace") => void;
}) {
  const [text, setText] = useState(OUTLINE_EXAMPLE);
  const [error, setError] = useState("");
  const parsed = useMemo(() => parseOutline(text, target), [text, target]);

  return (
    <Modal
      title="Paste an outline"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              if (parsed.length === 0) {
                setError("Use # for a domain, ## for a skill, and - for an item.");
                return;
              }
              onApply(parsed, "append");
            }}
          >
            Add to blueprint
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              if (parsed.length === 0) {
                setError("Use # for a domain, ## for a skill, and - for an item.");
                return;
              }
              onApply(parsed, "replace");
            }}
          >
            Replace domains
          </button>
        </>
      }
    >
      <p className="quiet">
        # Domain, ## Skill {"{target}"}, and - item. Start an item with ! or add [critical] to mark it critical. The number in braces is the “enough at” target.
      </p>
      <textarea rows={14} value={text} onChange={(event) => setText(event.target.value)} aria-label="Outline text" />
      {error ? <p className="form-error">{error}</p> : null}
      <p className="quiet">
        Parsed {parsed.length} domains, {parsed.reduce((sum, domain) => sum + domain.skills.length, 0)} skills,{" "}
        {parsed.reduce((sum, domain) => sum + domain.skills.reduce((inner, skill) => inner + skill.items.length, 0), 0)} items.
      </p>
    </Modal>
  );
}

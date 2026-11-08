import { useEffect, useState } from "react";
import { caseTypeLabel, levelLabel, scenarioLabel } from "../constants";
import { useApp } from "../store";
import type { CaseStatus, DevelopedCase } from "../types";
import { Pill } from "../ui";

const STATUS: { id: CaseStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "pilot", label: "Pilot" },
  { id: "active", label: "Active" },
];

export function CasesPage() {
  const { state, dispatch } = useApp();
  const [openId, setOpenId] = useState(state.focus.caseId ?? state.cases[0]?.id ?? "");

  useEffect(() => {
    if (state.focus.caseId) setOpenId(state.focus.caseId);
  }, [state.focus.caseId]);

  const developed = state.cases.find((item) => item.id === openId) ?? null;
  const cohorts = [...new Set(state.people.filter((p) => p.roles.includes("student")).map((p) => p.cohort))]
    .filter((cohort) => cohort !== "Faculty")
    .sort();

  function save(next: DevelopedCase) {
    dispatch({ type: "save-case", developed: next });
  }

  return (
    <div className="split-page">
      <div className="table-wrap">
        <table className="data clickable">
          <thead>
            <tr>
              <th>Case</th>
              <th>Type</th>
              <th>Level</th>
              <th>Status</th>
              <th>Skills</th>
            </tr>
          </thead>
          <tbody>
            {state.cases.map((item) => (
              <tr key={item.id} className={item.id === openId ? "is-selected" : undefined} onClick={() => setOpenId(item.id)}>
                <td>
                  <strong>{item.title}</strong>
                  <div className="quiet">{scenarioLabel(item.scenario)}</div>
                </td>
                <td>{caseTypeLabel(item.caseType)}</td>
                <td>{levelLabel(item.level)}</td>
                <td>{STATUS.find((status) => status.id === item.status)?.label}</td>
                <td>{item.domains.reduce((sum, domain) => sum + domain.skills.length, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {state.cases.length === 0 ? <p className="quiet">Develop a case from the coverage board once a skill has enough items.</p> : null}
      </div>

      {developed ? (
        <article className="panel case-detail">
          <label className="field">
            <span>Title</span>
            <input value={developed.title} onChange={(event) => save({ ...developed, title: event.target.value })} />
          </label>
          <div className="meta-row">
            <Pill>{scenarioLabel(developed.scenario)}</Pill>
            <Pill>{caseTypeLabel(developed.caseType)}</Pill>
            <Pill>{levelLabel(developed.level)}</Pill>
            {developed.omittedSkillCount > 0 ? <Pill tone="thin">{developed.omittedSkillCount} skills left in the blueprint</Pill> : null}
          </div>
          <label className="field">
            <span>Status</span>
            <select value={developed.status} onChange={(event) => save({ ...developed, status: event.target.value as CaseStatus })}>
              {STATUS.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Stem</span>
            <textarea rows={4} value={developed.stem} onChange={(event) => save({ ...developed, stem: event.target.value })} />
          </label>
          <fieldset className="checks">
            <legend>Assigned classes</legend>
            {cohorts.map((cohort) => (
              <label key={cohort}>
                <input
                  type="checkbox"
                  checked={developed.assignedCohorts.includes(cohort)}
                  onChange={() => {
                    const assignedCohorts = developed.assignedCohorts.includes(cohort)
                      ? developed.assignedCohorts.filter((item) => item !== cohort)
                      : [...developed.assignedCohorts, cohort];
                    save({ ...developed, assignedCohorts });
                  }}
                />
                Class of {cohort}
              </label>
            ))}
          </fieldset>
          <h3 className="subhead">Checklist carried into this case</h3>
          {developed.domains.map((domain) => (
            <section key={domain.id} className="case-domain">
              <h4>{domain.name}</h4>
              {domain.skills.map((skill) => (
                <div key={skill.id}>
                  <strong>
                    {skill.name} · {skill.items.length} items
                  </strong>
                  <ul>
                    {skill.items.map((item) => (
                      <li key={item.id}>
                        {item.critical ? <em>Critical. </em> : null}
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </article>
      ) : null}
    </div>
  );
}

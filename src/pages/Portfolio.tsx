import { useEffect, useState } from "react";
import { CANONICAL_DOMAINS, LEVELS, domainColor, levelLabel, scenarioLabel } from "../constants";
import { mean, round1 } from "../analytics";
import { formatDate } from "../ids";
import { useApp } from "../store";
export function PortfolioPage() {
  const { state, dispatch } = useApp();
  const canReview = state.activeRole === "admin" || state.activeRole === "assessment_educator";
  const students = state.people.filter((person) => person.roles.includes("student"));
  const self = state.people.find((person) => person.id === state.activePersonId);
  const defaultId = canReview ? state.focus.studentId ?? students[0]?.id ?? "" : self?.id ?? "";
  const [studentId, setStudentId] = useState(defaultId);
  const [statement, setStatement] = useState("");

  useEffect(() => {
    if (state.focus.studentId && canReview) setStudentId(state.focus.studentId);
  }, [state.focus.studentId, canReview]);

  const student = (canReview ? students : students.filter((person) => person.id === self?.id)).find((person) => person.id === studentId) ?? null;
  const portfolio = state.portfolios.find((item) => item.studentId === student?.id);

  useEffect(() => {
    setStatement(portfolio?.statement ?? "");
  }, [portfolio?.statement, student?.id]);

  if (!student) return <p>No student record is selected.</p>;

  const cases = state.cases.filter((item) => item.assignedCohorts.includes(student.cohort));
  const syntheses = state.syntheses.filter((item) => item.studentId === student.id);
  const feedback = state.feedback.filter((entry) => entry.studentId === student.id);
  const currentScores = CANONICAL_DOMAINS.map((domain) => {
    const values = state.scores.filter(
      (score) => score.studentId === student.id && score.domainName === domain && score.caseId == null && score.trainingYear === student.level,
    );
    return { domain, mean: mean(values.map((score) => score.score)) };
  });
  const byYear = LEVELS.map((level) => {
    const values = state.scores.filter(
      (score) => score.studentId === student.id && score.caseId == null && score.trainingYear === level.id,
    );
    return { label: level.label, mean: mean(values.map((score) => score.score)) };
  }).filter((row) => row.mean != null);

  function compile() {
    dispatch({
      type: "save-portfolio",
      portfolio: { studentId: student!.id, statement: statement.trim(), compiledAt: new Date().toISOString().slice(0, 10) },
    });
  }

  return (
    <div className="stack">
      {canReview ? (
        <label className="inline-field">
          <span>Student</span>
          <select value={student.id} onChange={(event) => setStudentId(event.target.value)}>
            {students.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name} · Class of {person.cohort}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <article className="portfolio-doc">
        <header className="doc-head">
          <div>
            <p className="kicker">Progress portfolio</p>
            <h2>{student.name}</h2>
            <p>
              Class of {student.cohort} · {levelLabel(student.level)}
              {portfolio?.compiledAt ? ` · Compiled ${formatDate(portfolio.compiledAt)}` : " · Not compiled yet"}
            </p>
          </div>
          <div className="row-actions">
            {state.activeRole === "student" || canReview ? (
              <button type="button" className="btn primary" onClick={compile}>
                {portfolio?.compiledAt ? "Update compiled portfolio" : "Compile portfolio"}
              </button>
            ) : null}
            <button type="button" className="btn ghost" onClick={() => window.print()}>
              Print or save
            </button>
          </div>
        </header>

        <label className="field">
          <span>Learning statement</span>
          <textarea rows={4} value={statement} onChange={(event) => setStatement(event.target.value)} />
        </label>

        <section>
          <h3>Domain progress this year</h3>
          <div className="bars">
            {currentScores.map((row) => (
              <div key={row.domain} className="bar-row">
                <span>{row.domain}</span>
                <div className="bar-track">
                  {row.mean != null ? <div className="bar-fill" style={{ width: `${row.mean}%`, background: domainColor(row.domain) }} /> : null}
                </div>
                <strong>{row.mean == null ? "—" : round1(row.mean)}</strong>
              </div>
            ))}
          </div>
          <p className="quiet">Illustrative sample scores for this portfolio, not an official grade.</p>
        </section>

        {byYear.length > 1 ? (
          <section>
            <h3>Across training years</h3>
            <ol className="year-line">
              {byYear.map((row) => (
                <li key={row.label}>
                  <span>{row.label}</span>
                  <strong>{round1(row.mean ?? 0)}</strong>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <section>
          <h3>Assigned cases</h3>
          {cases.length === 0 ? <p className="quiet">No case is assigned to this class yet.</p> : null}
          {cases.map((item) => (
            <article key={item.id} className="case-domain">
              <h4>
                {item.title} · {scenarioLabel(item.scenario)}
              </h4>
              <p>{item.stem}</p>
            </article>
          ))}
        </section>

        <section>
          <h3>Synthesized feedback</h3>
          {syntheses.length === 0 ? <p className="quiet">Feedback will appear here after a giver submits a transcript.</p> : null}
          {syntheses.map((item) => {
            const developed = state.cases.find((c) => c.id === item.caseId);
            const sources = feedback.filter((entry) => item.sourceIds.includes(entry.id));
            return (
              <article key={item.id} className="synthesis">
                <h4>{developed?.title ?? "Case"}</h4>
                <p>{item.narrative}</p>
                {item.strengths.length > 0 ? (
                  <>
                    <h5>Held up</h5>
                    <ul>
                      {item.strengths.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {item.growth.length > 0 ? (
                  <>
                    <h5>Practice next</h5>
                    <ul>
                      {item.growth.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {sources.length > 0 ? (
                  <details>
                    <summary>Original feedback ({sources.length})</summary>
                    {sources.map((entry) => {
                      const giver = state.people.find((person) => person.id === entry.giverId);
                      return (
                        <blockquote key={entry.id}>
                          <footer>
                            {giver?.name ?? "Feedback giver"} · {entry.mode.replaceAll("_", " ")} · {formatDate(entry.createdAt)}
                            {entry.narrativeTitle ? ` · revised “${entry.narrativeTitle}”` : ""}
                            {entry.attachmentName ? ` · ${entry.attachmentName}` : ""}
                          </footer>
                          <p>{entry.transcript}</p>
                        </blockquote>
                      );
                    })}
                  </details>
                ) : null}
              </article>
            );
          })}
        </section>
      </article>
    </div>
  );
}

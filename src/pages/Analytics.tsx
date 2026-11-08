import { useMemo, useState } from "react";
import { CANONICAL_DOMAINS, LEVELS, RACES, domainColor, levelLabel } from "../constants";
import { EMPTY_FILTERS, MIN_CELL, breakdown, domainMeans, longitudinal, matchPerson, mean, round1, type DemoFilters } from "../analytics";
import { useApp } from "../store";
import type { Level } from "../types";

export function AnalyticsPage() {
  const { state, dispatch } = useApp();
  const students = state.people.filter((person) => person.roles.includes("student"));
  const cohorts = [...new Set(students.map((person) => person.cohort))].sort();
  const [filters, setFilters] = useState<DemoFilters>({ ...EMPTY_FILTERS });
  const [mode, setMode] = useState<"cross" | "long">("cross");
  const [caseId, setCaseId] = useState<string>("progress");
  const [breakBy, setBreakBy] = useState<"none" | "gender" | "race" | "ethnicity" | "urim">("none");

  const filtered = students.filter((person) => matchPerson(person, filters));
  const domains = [...CANONICAL_DOMAINS];

  const cross = useMemo(() => {
    if (caseId === "progress") {
      return domainMeans(filtered, state.scores, domains, (_person, score) => score.caseId == null && score.trainingYear === _person.level);
    }
    return domainMeans(filtered, state.scores, domains, (_person, score) => score.caseId === caseId);
  }, [filtered, state.scores, caseId, domains]);

  const long = useMemo(() => longitudinal(filtered, state.scores, domains), [filtered, state.scores, domains]);

  const groups = useMemo(() => {
    if (breakBy === "none") return [];
    const key =
      breakBy === "gender"
        ? (person: (typeof students)[number]) => person.gender
        : breakBy === "race"
          ? (person: (typeof students)[number]) => person.race
          : breakBy === "ethnicity"
            ? (person: (typeof students)[number]) => person.ethnicity
            : (person: (typeof students)[number]) => (person.urim ? "URiM recorded: yes" : "URiM recorded: no");
    return breakdown(filtered, state.scores, key);
  }, [breakBy, filtered, state.scores]);

  function set<K extends keyof DemoFilters>(key: K, value: DemoFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="stack">
      <p className="callout">
        Scores below are illustrative sample data so the filters can be tried. They are not real learner results. URiM status is a field the school records; this dashboard does not infer it from race or ethnicity. A group mean is hidden when fewer than {MIN_CELL} learners are in the cell.
      </p>
      <div className="toolbar wrap">
        <label className="inline-field">
          <span>View</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as "cross" | "long")}
            disabled={caseId !== "progress"}
          >
            <option value="cross">Cross-section, current year</option>
            <option value="long">Longitudinal, one class across years</option>
          </select>
        </label>
        <label className="inline-field">
          <span>Source</span>
          <select value={caseId} onChange={(event) => setCaseId(event.target.value)}>
            <option value="progress">Progress scores by domain</option>
            {state.cases.map((item) => (
              <option key={item.id} value={item.id}>
                Case: {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Class</span>
          <select value={filters.cohort} onChange={(event) => set("cohort", event.target.value)}>
            <option value="all">All classes</option>
            {cohorts.map((cohort) => (
              <option key={cohort} value={cohort}>
                Class of {cohort}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Current year</span>
          <select value={filters.level} onChange={(event) => set("level", event.target.value as Level | "all")} disabled={mode === "long"}>
            <option value="all">All years</option>
            {LEVELS.map((level) => (
              <option key={level.id} value={level.id}>
                {level.label}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Gender</span>
          <select value={filters.gender} onChange={(event) => set("gender", event.target.value)}>
            <option value="all">All</option>
            {["Woman", "Man", "Nonbinary", "Prefer not to say"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Race</span>
          <select value={filters.race} onChange={(event) => set("race", event.target.value)}>
            <option value="all">All</option>
            {RACES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Ethnicity</span>
          <select value={filters.ethnicity} onChange={(event) => set("ethnicity", event.target.value)}>
            <option value="all">All</option>
            {["Hispanic or Latino", "Not Hispanic or Latino", "Prefer not to say"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>URiM</span>
          <select value={filters.urim} onChange={(event) => set("urim", event.target.value as DemoFilters["urim"])}>
            <option value="all">All</option>
            <option value="yes">Recorded yes</option>
            <option value="no">Recorded no</option>
          </select>
        </label>
      </div>

      <div className="stats">
        <div className="stat">
          <strong>{filtered.length}</strong>
          <span>Students in this filter</span>
        </div>
        <div className="stat">
          <strong>{filtered.filter((person) => state.portfolios.some((p) => p.studentId === person.id && p.compiledAt)).length}</strong>
          <span>Compiled portfolios</span>
        </div>
      </div>

      {mode === "cross" || caseId !== "progress" ? (
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2>{caseId === "progress" ? "Cross-section by domain" : "This case by domain"}</h2>
              <p>
                {caseId === "progress"
                  ? "Each bar is the mean of students’ current-year domain scores."
                  : "Each bar is the mean on this case for students who match the filter."}
              </p>
            </div>
          </header>
          <BarChart rows={cross} />
        </section>
      ) : (
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2>Longitudinal by training year</h2>
              <p>The same filtered students, scored in each year they have sample data. Lines stop where a cell has fewer than {MIN_CELL} learners.</p>
            </div>
          </header>
          <LineChart series={long} domains={domains} />
        </section>
      )}

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>Break down the current-year mean</h2>
            <p>Overall mean across domains for the filtered students, split by one recorded variable.</p>
          </div>
          <label className="inline-field">
            <span>Break down by</span>
            <select value={breakBy} onChange={(event) => setBreakBy(event.target.value as typeof breakBy)}>
              <option value="none">No breakdown</option>
              <option value="gender">Gender</option>
              <option value="race">Race</option>
              <option value="ethnicity">Ethnicity</option>
              <option value="urim">URiM status</option>
            </select>
          </label>
        </header>
        {breakBy === "none" ? (
          <p className="quiet">Choose a variable to compare groups. Small groups stay hidden.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>Group</th>
                <th>Students</th>
                <th>Mean</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.group}>
                  <td>{group.group}</td>
                  <td>{group.n}</td>
                  <td>{group.mean == null ? `Hidden (n < ${MIN_CELL})` : round1(group.mean)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Students</h2>
        </header>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Student</th>
                <th>Class</th>
                <th>Year</th>
                <th>Gender</th>
                <th>Race</th>
                <th>Ethnicity</th>
                <th>URiM</th>
                <th>Current mean</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => {
                const values = state.scores.filter(
                  (score) => score.studentId === person.id && score.caseId == null && score.trainingYear === person.level,
                );
                const avg = mean(values.map((score) => score.score));
                return (
                  <tr key={person.id}>
                    <td>{person.name}</td>
                    <td>Class of {person.cohort}</td>
                    <td>{levelLabel(person.level)}</td>
                    <td>{person.gender}</td>
                    <td>{person.race}</td>
                    <td>{person.ethnicity}</td>
                    <td>{person.urim ? "Yes" : "No"}</td>
                    <td>{avg == null ? "—" : round1(avg)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => dispatch({ type: "go", page: "portfolio", focus: { studentId: person.id } })}
                      >
                        Portfolio
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function BarChart({ rows }: { rows: { domain: string; mean: number | null; n: number }[] }) {
  return (
    <div className="bars">
      {rows.map((row) => (
        <div key={row.domain} className="bar-row">
          <span>{row.domain}</span>
          <div className="bar-track">
            {row.mean != null ? (
              <div className="bar-fill" style={{ width: `${row.mean}%`, background: domainColor(row.domain) }} />
            ) : null}
          </div>
          <strong>{row.mean == null ? `n=${row.n}` : round1(row.mean)}</strong>
        </div>
      ))}
    </div>
  );
}

function LineChart({
  series,
  domains,
}: {
  series: { label: string; points: { domain: string; mean: number | null; n: number }[] }[];
  domains: readonly string[];
}) {
  const width = 680;
  const height = 240;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const yOf = (value: number) => pad.t + ((100 - value) / 50) * innerH;
  const xOf = (index: number) => pad.l + (series.length <= 1 ? innerW / 2 : (index / (series.length - 1)) * innerW);

  return (
    <div className="chart-block">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Domain means from year 1 to year 4">
        {[50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={pad.l} x2={width - pad.r} y1={yOf(tick)} y2={yOf(tick)} className="grid-line" />
            <text x={pad.l - 8} y={yOf(tick) + 4} textAnchor="end" className="axis-label">
              {tick}
            </text>
          </g>
        ))}
        {series.map((point, index) => (
          <text key={point.label} x={xOf(index)} y={height - 8} textAnchor="middle" className="axis-label">
            {point.label}
          </text>
        ))}
        {domains.map((domain) => {
          const pts = series.map((column, index) => {
            const found = column.points.find((point) => point.domain === domain);
            return found?.mean == null ? null : { x: xOf(index), y: yOf(found.mean) };
          });
          const d = pts
            .map((point, index) => (point ? `${index === 0 || pts[index - 1] == null ? "M" : "L"} ${point.x} ${point.y}` : ""))
            .join(" ");
          return <path key={domain} d={d} fill="none" stroke={domainColor(domain)} strokeWidth="2" />;
        })}
      </svg>
      <ul className="legend-list">
        {domains.map((domain) => (
          <li key={domain}>
            <i style={{ background: domainColor(domain) }} />
            {domain}
          </li>
        ))}
      </ul>
      <p className="quiet">Axis runs from 50 to 100 so year-to-year change is visible.</p>
    </div>
  );
}

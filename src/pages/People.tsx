import { useState } from "react";
import { GIVER_KINDS, LEVELS, RACES, ROLES, giverKindLabel, levelLabel, roleLabel } from "../constants";
import { uid } from "../ids";
import { useApp } from "../store";
import type { Ethnicity, Gender, GiverKind, Level, Person, Race } from "../types";
import { Field } from "../ui";

const GENDERS: Gender[] = ["Woman", "Man", "Nonbinary", "Prefer not to say"];
const ETHNICITIES: Ethnicity[] = ["Hispanic or Latino", "Not Hispanic or Latino", "Prefer not to say"];

const EMPTY: Person = {
  id: "",
  name: "",
  email: "",
  roles: ["student"],
  giverKinds: [],
  gender: "Prefer not to say",
  race: "Prefer not to say",
  ethnicity: "Prefer not to say",
  urim: false,
  cohort: "2030",
  level: "Y1",
};

export function PeoplePage() {
  const { state, dispatch, toast } = useApp();
  const [editing, setEditing] = useState<Person | null>(null);
  const [error, setError] = useState("");

  function save() {
    if (!editing) return;
    if (!editing.name.trim() || !editing.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (editing.roles.length === 0) {
      setError("Assign at least one role.");
      return;
    }
    if (editing.roles.includes("feedback_giver") && editing.giverKinds.length === 0) {
      setError("Choose what kind of feedback giver this person is.");
      return;
    }
    const emailTaken = state.people.some((person) => person.email.toLowerCase() === editing.email.trim().toLowerCase() && person.id !== editing.id);
    if (emailTaken) {
      setError("That email is already in the directory.");
      return;
    }
    const person: Person = {
      ...editing,
      id: editing.id || uid("p"),
      name: editing.name.trim(),
      email: editing.email.trim(),
      giverKinds: editing.roles.includes("feedback_giver") ? editing.giverKinds : [],
    };
    dispatch({ type: "save-person", person });
    setEditing(null);
    setError("");
    toast(`${person.name} now has ${person.roles.map(roleLabel).join(", ")}.`);
  }

  return (
    <div className="stack">
      <p className="quiet">
        An admin can assign more than one role. Feedback givers may be faculty, assessment educators, standardized patients, students, or upper-class peers. Demographic fields are sample records, not inferred by the app.
      </p>
      <div className="row-actions">
        <button type="button" className="btn primary" onClick={() => { setEditing({ ...EMPTY }); setError(""); }}>
          Add person
        </button>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Roles</th>
              <th>Gives feedback as</th>
              <th>Class</th>
              <th>Year</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {state.people.map((person) => (
              <tr key={person.id}>
                <td>
                  <strong>{person.name}</strong>
                  <div className="quiet">{person.email}</div>
                </td>
                <td>{person.roles.map(roleLabel).join(", ")}</td>
                <td>{person.giverKinds.map(giverKindLabel).join(", ") || "—"}</td>
                <td>{person.cohort === "Faculty" ? "Faculty" : `Class of ${person.cohort}`}</td>
                <td>{person.roles.includes("student") ? levelLabel(person.level) : "—"}</td>
                <td>
                  <button type="button" className="btn ghost small" onClick={() => { setEditing(person); setError(""); }}>
                    Edit roles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <section className="panel">
          <h2>{editing.id ? `Roles for ${editing.name}` : "New person"}</h2>
          <div className="form-grid">
            <Field label="Name">
              <input value={editing.name} onChange={(event) => setEditing({ ...editing, name: event.target.value })} />
            </Field>
            <Field label="Email">
              <input value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} />
            </Field>
            <Field label="Class of">
              <input value={editing.cohort} onChange={(event) => setEditing({ ...editing, cohort: event.target.value })} />
            </Field>
            <Field label="Current year">
              <select value={editing.level} onChange={(event) => setEditing({ ...editing, level: event.target.value as Level })}>
                {LEVELS.map((level) => (
                  <option key={level.id} value={level.id}>
                    {level.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Gender">
              <select value={editing.gender} onChange={(event) => setEditing({ ...editing, gender: event.target.value as Gender })}>
                {GENDERS.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Race">
              <select value={editing.race} onChange={(event) => setEditing({ ...editing, race: event.target.value as Race })}>
                {RACES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Ethnicity">
              <select value={editing.ethnicity} onChange={(event) => setEditing({ ...editing, ethnicity: event.target.value as Ethnicity })}>
                {ETHNICITIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <label className="checkline">
              <input type="checkbox" checked={editing.urim} onChange={(event) => setEditing({ ...editing, urim: event.target.checked })} />
              <span>URiM status recorded as yes</span>
            </label>
          </div>
          <fieldset className="checks">
            <legend>Roles</legend>
            {ROLES.map((role) => (
              <label key={role.id}>
                <input
                  type="checkbox"
                  checked={editing.roles.includes(role.id)}
                  onChange={() => {
                    const roles = toggle(editing.roles, role.id);
                    const giverKinds =
                      role.id === "feedback_giver" && roles.includes("feedback_giver") && editing.giverKinds.length === 0
                        ? (["faculty"] as GiverKind[])
                        : editing.giverKinds;
                    setEditing({ ...editing, roles, giverKinds });
                  }}
                />
                <span>
                  <strong>{role.label}</strong> — {role.blurb}
                </span>
              </label>
            ))}
          </fieldset>
          {editing.roles.includes("feedback_giver") ? (
            <fieldset className="checks">
              <legend>Feedback giver kinds</legend>
              {GIVER_KINDS.map((kind) => (
                <label key={kind.id}>
                  <input
                    type="checkbox"
                    checked={editing.giverKinds.includes(kind.id)}
                    onChange={() => setEditing({ ...editing, giverKinds: toggle(editing.giverKinds, kind.id) })}
                  />
                  {kind.label}
                </label>
              ))}
            </fieldset>
          ) : null}
          {error ? <p className="form-error">{error}</p> : null}
          <div className="row-actions">
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button type="button" className="btn primary" onClick={save}>
              Save roles
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

import type { ReactNode } from "react";
import { PAGES, ROLES, pagesFor } from "./constants";
import { SAMPLE_NOTE } from "./seed";
import { cx } from "./ids";
import { useApp } from "./store";
import type { Role } from "./types";

export function Shell({ children }: { children: ReactNode }) {
  const { state, dispatch, toasts, dismiss } = useApp();
  const pages = pagesFor(state.activeRole);
  const current = PAGES.find((page) => page.id === state.page);
  const viewers = state.people.filter((person) => person.roles.includes(state.activeRole));

  return (
    <div className="app">
      <header className="chrome">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-kicker">Assessment faculty</div>
              <div className="brand-name">Blueprint</div>
            </div>
          </div>
          <div className="identity-row">
            <label className="identity">
              <span>Role</span>
              <select
                value={state.activeRole}
                onChange={(event) => dispatch({ type: "set-role", role: event.target.value as Role })}
              >
                {ROLES.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="identity">
              <span>Person</span>
              <select value={state.activePersonId} onChange={(event) => dispatch({ type: "set-person", personId: event.target.value })}>
                {viewers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                if (window.confirm("Replace everything in this browser with the sample blueprint bank?")) {
                  dispatch({ type: "restore" });
                }
              }}
            >
              Restore sample data
            </button>
          </div>
        </div>
        <nav className="tabs" aria-label="Dashboard">
          {pages.map((page) => (
            <button
              key={page.id}
              type="button"
              className={cx("tab", state.page === page.id && "on")}
              onClick={() => dispatch({ type: "go", page: page.id })}
            >
              {page.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="main">
        <header className="page-head">
          <div>
            <h1>{current?.label}</h1>
            <p className="lede">{current?.lede}</p>
          </div>
        </header>
        {children}
        <p className="foot-note">{SAMPLE_NOTE}</p>
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.map((item) => (
          <div key={item.id} className="toast">
            <span>{item.text}</span>
            {item.onUndo ? (
              <button
                type="button"
                onClick={() => {
                  item.onUndo?.();
                  dismiss(item.id);
                }}
              >
                Undo
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

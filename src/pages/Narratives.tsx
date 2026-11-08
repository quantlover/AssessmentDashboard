import { scenarioLabel } from "../constants";
import { useApp } from "../store";
import type { Narrative } from "../types";
import { Pill } from "../ui";

export function NarrativesPage() {
  const { state, dispatch } = useApp();
  const canEdit = state.activeRole === "admin" || state.activeRole === "assessment_educator";
  const canUse = state.activeRole === "feedback_giver" || state.activeRole === "admin" || state.activeRole === "assessment_educator";
  const rows = state.blueprints.flatMap((bp) => bp.narratives.map((narrative) => ({ bp, narrative })));

  function update(blueprintId: string, narrative: Narrative) {
    const blueprint = state.blueprints.find((bp) => bp.id === blueprintId);
    if (!blueprint) return;
    dispatch({
      type: "save-blueprint",
      blueprint: {
        ...blueprint,
        updatedAt: new Date().toISOString(),
        narratives: blueprint.narratives.map((item) => (item.id === narrative.id ? narrative : item)),
      },
    });
  }

  return (
    <div className="stack">
      <p className="quiet">
        Assessment educators write or upload the example feedback. A giver opens one, revises it, and submits. The revised text is what gets transcribed into the student synthesis.
      </p>
      {rows.length === 0 ? <p>No sample narratives yet. Add them from a blueprint in the studio.</p> : null}
      <div className="narrative-grid">
        {rows.map(({ bp, narrative }) => (
          <article key={narrative.id} className="narrative-card">
            <div className="meta-row">
              <Pill>{scenarioLabel(bp.scenario)}</Pill>
              <Pill tone={narrative.tone === "growth" ? "thin" : narrative.tone === "strength" ? "ready" : "neutral"}>
                {narrative.tone}
              </Pill>
            </div>
            {canEdit ? (
              <input aria-label="Title" value={narrative.title} onChange={(event) => update(bp.id, { ...narrative, title: event.target.value })} />
            ) : (
              <h2>{narrative.title}</h2>
            )}
            <p className="quiet">{bp.title}</p>
            {canEdit ? (
              <textarea rows={6} aria-label="Narrative" value={narrative.body} onChange={(event) => update(bp.id, { ...narrative, body: event.target.value })} />
            ) : (
              <p>{narrative.body}</p>
            )}
            <div className="row-actions">
              {canEdit ? (
                <label className="btn ghost small file-btn">
                  Replace from text file
                  <input
                    type="file"
                    accept=".txt,.md,text/plain"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      const body = (await file.text()).slice(0, 20000);
                      update(bp.id, { ...narrative, body, title: narrative.title || file.name });
                    }}
                  />
                </label>
              ) : null}
              {canUse ? (
                <button
                  type="button"
                  className="btn primary small"
                  onClick={() =>
                    dispatch({
                      type: "go",
                      page: "feedback",
                      focus: { blueprintId: bp.id, narrativeId: narrative.id },
                    })
                  }
                >
                  Revise in feedback
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

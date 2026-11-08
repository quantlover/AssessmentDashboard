import { uid } from "./ids";
import type { Domain } from "./types";

/**
 * # Domain
 * ## Skill {4}
 * - Checklist item
 * - !Critical item
 * - Item text [critical]
 */
export function parseOutline(text: string, defaultTarget: number): Domain[] {
  const domains: Domain[] = [];
  let domain: Domain | null = null;
  let skill: Domain["skills"][number] | null = null;

  const ensureDomain = () => {
    if (!domain) {
      domain = { id: uid("dom"), name: "General", skills: [] };
      domains.push(domain);
    }
    return domain;
  };

  const ensureSkill = () => {
    const parent = ensureDomain();
    if (!skill) {
      skill = { id: uid("skill"), name: "Checklist", targetItems: defaultTarget, items: [] };
      parent.skills.push(skill);
    }
    return skill;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;

    if (line.startsWith("##")) {
      const parent = ensureDomain();
      const rawName = line.replace(/^##\s*/, "").trim();
      const match = rawName.match(/^(.*?)(?:\s*\{(\d+)\})?$/);
      const name = (match?.[1] ?? rawName).trim() || "Skill";
      const target = match?.[2] ? Number(match[2]) : defaultTarget;
      skill = {
        id: uid("skill"),
        name,
        targetItems: Number.isFinite(target) && target > 0 ? target : defaultTarget,
        items: [],
      };
      parent.skills.push(skill);
      continue;
    }

    if (line.startsWith("#")) {
      domain = { id: uid("dom"), name: line.replace(/^#+\s*/, "").trim() || "Domain", skills: [] };
      domains.push(domain);
      skill = null;
      continue;
    }

    if (line.startsWith("-") || line.startsWith("*")) {
      const parentSkill = ensureSkill();
      let body = line.replace(/^[-*]\s*/, "").trim();
      const critical = body.startsWith("!") || /\[critical\]/i.test(body);
      body = body.replace(/^!\s*/, "").replace(/\[critical\]/gi, "").trim();
      if (!body) continue;
      parentSkill.items.push({
        id: uid("item"),
        text: body,
        critical,
        points: critical ? 2 : 1,
      });
      continue;
    }
  }

  return domains.filter((d) => d.name.trim());
}

export const OUTLINE_EXAMPLE = `# History
## Red flag screening {4}
- !Asks about fever and vomiting blood
- Asks about unintentional weight loss
- Asks about syncope
- Screens pregnancy when relevant
## Past history
- Reviews medications and allergies

# Clinical reasoning
## Differential {3}
- Names at least three plausible diagnoses
- States which diagnosis must not be missed
- Links one finding to the leading diagnosis`;

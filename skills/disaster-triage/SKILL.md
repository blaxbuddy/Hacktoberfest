---
name: disaster-triage
description: Analyzes multimodal disaster reports, incident photos, and citizen descriptions to classify hazards, calculate severity scores, and output emergency response protocols. Use when processing reports of floods, fires, earthquakes, structural collapses, or extreme weather events.
license: MIT
metadata:
  version: "1.0.0"
  author: "ResQNet Team"
---

# Disaster Triage Skill

This skill guides an agent in processing raw incoming disaster field reports (textual descriptions and optional incident photos) to produce actionable, structured emergency response assessments.

## Execution Workflow

1. **Input Ingestion:** Receive citizen field reports containing location context, text descriptions, and optional base64 image strings.
2. **Threat Classification:** Identify the primary hazard category (`Flood`, `Fire`, `Structural`, `Medical`, or `Weather`).
3. **Severity Assessment:** Rate incident severity from `1` (Low/Informational) to `5` (Catastrophic/Immediate Threat to Life).
4. **Evacuation Determination:** Set `evacuation_needed` to `true` whenever `severity_score >= 4` or immediate environmental collapse is visible.
5. **Protocol Generation:** Output direct, bulleted emergency survival instructions tailored to panicked civilians.

## Output Specification

The agent must output a valid JSON object strictly conforming to the schema defined in [assets/triage-schema.json](assets/triage-schema.json). Detailed classification guidelines are available in [references/REFERENCE.md](references/REFERENCE.md).

```json
{
  "hazard_type": "Flood",
  "severity_score": 4,
  "evacuation_needed": true,
  "action_plan": "- Move to higher ground immediately.\n- Avoid walking or driving through moving water.\n- Disconnect main electrical switches if safe."
}

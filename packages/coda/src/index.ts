/**
 * coda — CODA Pi Extension
 *
 * Compounding Orchestrated Development Architecture
 *
 * Layers (on top of @coda/core L1-L3):
 *   L4: Tools      — coda_create, coda_update, coda_read, coda_query, coda_signal,
 *                     coda_advance, coda_status, coda_run_tests, coda_edit_body, write-gate
 *   L5: FORGE      — greenfield, brownfield, additive, transformative design flows
 *   L6: Workflow   — phase runner, build loop, context builder, review/verify runners, ceremony
 *   L7: Pi         — extension entry, commands, hooks, UI
 *
 * Commands:
 *   /coda          — status dashboard
 *   /coda forge    — design layer (greenfield/brownfield/additive/transformative)
 *   /coda new      — create issue
 *   /coda activate — start working an issue
 *   /coda advance  — move to next phase
 *   /coda build    — start autonomous BUILD loop
 *   /coda pause    — save state for later
 *   /coda resume   — pick up where left off
 *   /coda back     — rewind to prior phase
 *   /coda audit    — spec drift detection + optional LENS escalation
 *   /coda kill     — terminate issue
 */

// Will export the Pi extension entry point
// export default function(pi: PiAPI) { ... }

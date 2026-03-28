/**
 * HELM Extension
 *
 * Holistic Engineering Lifecycle Management
 *
 * The operator-level workspace layer that sits above individual CODA projects:
 *   - Project registry — knows about all your CODA projects, their health, state
 *   - Operator profile — north star, values, constraints (shared across projects)
 *   - Cross-project analytics — velocity, stalls, blocking patterns, trends
 *   - MUSE pipeline visibility — ideas in incubation, graduation candidates
 *
 * Commands:
 *   /helm          — workspace dashboard (all projects)
 *   /helm projects — list all registered CODA projects with status
 *   /helm pulse    — cross-project health check
 *   /helm profile  — view/edit operator profile
 *
 * Integration with CODA:
 *   - CODA projects auto-register with HELM on init
 *   - HELM's operator profile optionally informs FORGE design decisions
 *   - Cross-project patterns can feed module overlays
 *
 * Phase 4 — post-v1, stubbed for now.
 */

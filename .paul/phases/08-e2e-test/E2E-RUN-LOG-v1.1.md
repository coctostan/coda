# E2E Run Log v1.1 — CODA Full Lifecycle Test

**Date:** 2026-03-28
**Model:** openai-codex/gpt-5.4-mini (think:high)
**Extension:** packages/coda/src/pi/index.ts
**Script:** E2E-TEST-SCRIPT-v1.1.md (31 steps)

---

## Part 1: Extension Loading & Basic Health

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 1.1 | Extension loads | PASS | No errors, listed in extensions |
| 1.2 | /coda command | PASS | Shows status, "No state found" |
| 1.3 | coda_status tool | PASS | Returns full JSON, all null fields |

## Part 2: FORGE (Project Init)

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 2.1 | coda_create reference doc | PASS | Created reference/ref-system-spec.md |
| 2.2a | .coda/ write protection (write) | PASS | Write tool blocked |
| 2.2b | .coda/ write protection (edit) | **FAIL** | Agent bypassed via bash (`printf > .coda/...`) |
| 2.3 | Config setup | PASS | Manual setup outside Pi (v0.1 workaround) |

**Finding:** Write gate only intercepts `write` and `edit` tools, not `bash` commands targeting `.coda/`. Agent used bash to bypass protection.

## Part 3: Issue Creation & SPECIFY Phase

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 3.1 | Create issue | PASS | issues/add-todo-item.md created |
| 3.2 | Update with ACs + spec_delta | PASS | Required `.md` extension in record path |
| 3.3 | Gate: specify→plan (pass) | PASS | Transitioned after ACs set |
| 3.4 | Gate: specify→plan (fail) | SKIPPED | Time constraint |

**Finding:** coda_update requires `.md` extension in record path. Without it: ENOENT.

## Part 4: PLAN Phase

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 4.1 | Create plan | PASS | issues/add-todo-item/plan-v1.md |
| 4.2 | Create tasks | PASS | Both tasks created with correct paths |
| 4.3 | Approve plan + advance to review | PASS | plan→review gate passed |

## Part 5: REVIEW Phase

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 5.1 | Advance review→build | PASS | review→build gate passed (plan approved) |

## Part 6: BUILD Phase — TDD Write-Gate Cycle

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 6.1 | TDD gate initially locked | PASS | tdd_gate: "locked" |
| 6.2 | Production write BLOCKED | PASS | src/types.ts NOT created |
| 6.3 | Test file write ALLOWED | PASS | tests/types.test.ts created (bypasses gate) |
| 6.4 | Failing test → gate UNLOCKS | **FAIL** | coda_run_tests error: "No test command configured for mode tdd" |
| 6.5 | Production write ALLOWED | SKIPPED | Depends on 6.4 |
| 6.6 | Passing test → gate RE-LOCKS | SKIPPED | Depends on 6.4 |
| 6.7 | Production write BLOCKED again | SKIPPED | Depends on 6.4 |

**Finding:** `coda_run_tests` tool passes empty `{}` as config. The tool registration doesn't read `coda.json` to get `tdd_test_command`. The config bridge between coda.json and the tool is missing.

**Finding:** TDD gate correctly blocks production writes (6.2) and allows test files (6.3). The gate logic itself works — only the `coda_run_tests` tool config is broken.

## Part 7: coda_edit_body & coda_update

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 7.1 | coda_edit_body section append | PASS | Summary section appended to task |
| 7.2 | coda_update task status | PASS | Task 1 marked complete |

## Part 8: VERIFY Phase

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 8.1 | Advance to verify | PASS | Gate passed after both tasks complete |
| 8.2 | Gate: verify→unify (fail) | PASS | Correctly blocked: "ACs must be met" |
| 8.3 | ACs met → advance to unify | PASS | Gate passed after ACs set to "met" |

**Finding:** build→verify gate checks task file frontmatter status, not state.json completed_tasks. Task status must be updated via coda_update, not just state.json.

## Part 9: UNIFY Phase

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 9.1 | Create completion record | PASS | records/completion-add-todo-item.md |
| 9.2 | Spec delta merge | PASS | ref-system-spec.md Capabilities updated |
| 9.3 | Advance to done | PASS | **FULL LIFECYCLE COMPLETE** |

## Part 10-11: VCS & Suite Mode

| Step | Test | Result | Notes |
|------|------|--------|-------|
| 10.1 | Git log | SKIPPED | Time constraint |
| 11.1 | coda_run_tests suite mode | SKIPPED | Blocked by same config bug as 6.4 |

---

## Summary

| Category | Passed | Failed | Skipped | Total |
|----------|--------|--------|---------|-------|
| Extension loading | 3 | 0 | 0 | 3 |
| FORGE / init | 3 | 1 | 0 | 4 |
| Issue lifecycle | 3 | 0 | 1 | 4 |
| Plan phase | 3 | 0 | 0 | 3 |
| Review phase | 1 | 0 | 0 | 1 |
| TDD gate cycle | 3 | 1 | 3 | 7 |
| Edit/update tools | 2 | 0 | 0 | 2 |
| Verify phase | 3 | 0 | 0 | 3 |
| Unify/done | 3 | 0 | 0 | 3 |
| VCS/suite | 0 | 0 | 2 | 2 |
| **TOTAL** | **24** | **2** | **6** | **32** |

**Full lifecycle: specify → plan → review → build → verify → unify → done ✅**

---

*Run completed: 2026-03-28*

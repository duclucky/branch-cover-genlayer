# Safety and reuse review

Source SHA-256: 576e16ac2e294ff5382bd4a2766d623f219a1e5f915082ef7cdd713ad68e2f82.
The deployed contract and its public behavior were unchanged by this review.

| Criterion | Finding | Evidence |
|---|---|---|
| Meaning equivalence | PASS: independently evaluated six-cell decisions and code-derived liabilities; source stage, IDs and beneficiaries remain critical | Replay accepts paraphrased rationale/order/case but rejects a flipped cell and beneficiary swap with identical liability totals; four live reviews |
| Structured state | PASS: keyed immutable book terms, append-only attempts/masks, explicit phases and own credits | Source/schema; entity-isolation and creation-after-closure tests; five canonical final books |
| Authorization/authenticity | PASS: actual runtime sender and complete domain-bound assent precede consequence | Authority matrix; hash-valid wrong actor/book tests; real separate beneficiary ratifications and caller-spoof smoke |
| Temporal safety | PASS: each timed write owns its clock guard; equality is late except lower-bound recovery; inclusive seven-day creation cap | Stale-phase -1/equality/+1 cases, fully funded RATIFYING/READY recovery, live partial/UNCLEAR/compiled expiry |
| Accounting/recovery | PASS: locked + credits + withdrawn = received, no regrowth or duplicate settlement/exit | Exhaustive matrices/masks, accounting-fault rejection, 39 audited operations and seven exact native exits |
| Reuse | PASS for the bounded primitive: generic contingent commitments and shrinking-menu margin | Proposed LangGraph/A2A/DAOhaus call paths; independent original kernel; no deployed adoption claim |
| Scope/limits | PASS: internal choice, fixed co-ratified controller, bounded source/time/retry and 1-2 GEN faces | Specification, get_policy, real UNCLEAR-to-RETRYABLE and complete recovery |

The original state-model text permits repeat exact assent after READY. Its
safety-table allowed-state cell omitted READY; the cell now explicitly includes
it. Behavior remains unchanged. Branch feasibility is clarified as retained-menu
membership; can_choose supplies current state/time eligibility.

Added tests cover invalid roles/text/values, empty/out-of-domain masks, invalid
GEN withdrawals, the inclusive seven-day creation cap, fully funded uncompiled
recovery, second-claim-only settlement, creation after zero closure, and
same-total/different-beneficiary semantic meaning. Fresh npm run check:
**102 Python + 9 script tests pass**, no skips.

Receipt projection now reads the SDK's full validator collection. The requirement
for completed independent agreement remains enforced; idle rows or vote labels
alone do not satisfy it. No contract validator, grader, authority rule, expected
label or accounting invariant was weakened.

The controller is explicitly trusted to choose among remaining internal branches.
Consensus was quorum-based with dissent/idle metadata, not unanimous. External
execution, legal debt, guaranteed model accuracy and adoption remain unclaimed.

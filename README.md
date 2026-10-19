# BranchCover

BranchCover is a standalone Intelligent Contract for conditional GEN payment
commitments over a finite menu of protocol choices. Independent validators
interpret which conditions each branch activates. Contract code retains enough
GEN to pay every promise on any remaining branch, releases only proven surplus
when branches are permanently removed, and settles one authenticated choice.

The funder benefits from understating exposure; beneficiaries benefit from
overstating it. Neither supplies a trusted activation table. A backend or EVM
can compute a maximum from supplied bits, but cannot replace independent
interpretation of the ratified natural-language conditions.

This repository is contract-only. The rights are internal protocol commitments;
it does not establish external performance, legal debt or real-world solvency.
See [specification](docs/README.md) for scope, safety, accounting and tests.
See [verification](docs/VERIFICATION.md) for platform adapters and evidence limits.

## Deployment

NETWORK = Studio Dev, chain ID **61997**, currency GEN.

CONTRACT_ADDRESS = `0xf853a3129f39c91489Ce3187f3cbb1497d4d2ac6`

[Contract Explorer](https://explorer-studio-dev.genlayer.com/address/0xf853a3129f39c91489Ce3187f3cbb1497d4d2ac6)
| [Deploy transaction](https://explorer-studio-dev.genlayer.com/tx/0x5d23777e3e48d3da078cd68b112c316e6a24449becbe1fd9dc5f4316cbb7431a)

Deployment is FINALIZED, **Result: SUCCESS**. Deployed source and all 20
methods match the local source. Source commit
`411579b2875acde10134d9549bcab87ccbd9c094`; SHA-256
`576e16ac2e294ff5382bd4a2766d623f219a1e5f915082ef7cdd713ad68e2f82`.
The Explorer transaction was independently opened and showed SUCCESS.
Five live books have reached CLOSED, with 13 GEN received and 13 GEN withdrawn,
zero reserve, zero credits and zero native contract balance. A separate fresh
read-only audit reconciles the operations, independent validators and all native
exits. [Source/test CI](https://github.com/duclucky/branch-cover-genlayer/actions/runs/39243189401)
is SUCCESS for the published code/test commit. The unchanged objective checker
reports 0 BLOCKER and 0 WARN; see the acceptance evidence and Portal packet below.

## How consensus controls money

The leader independently fetches the fixed dated W3C ODRL context, verifies
its exact raw digest and judges six claim-by-branch cells as TRIGGERED,
NOT_TRIGGERED or UNCLEAR. The validator independently refetches and evaluates
the same conditions. It compares the **meaning** of all normalized decisions
and their code-derived liabilities, never JSON text, reason wording or shape
alone. Changed cell meaning rejects; changed rationale, enum case or cell
order can agree. Non-Return, malformed coverage and invalid classes reject.

For each branch, code sums every triggered fixed face. Required reserve is
the maximum liability over the remaining nonempty branch mask. The model
cannot choose a recipient, amount, controller, branch or payout. UNCLEAR or
unavailable source preserves locked GEN in RETRYABLE. Successful compilation
freezes the table. Removed branches can never regrow after surplus release.

## Worked example

Real Studio Dev result for `archive-pruned-v1` (also reproduced in the separate
joint-payment book):

| Claim face | B0: read only | B1: publish only | B2: read and publish |
|---|---|---|---|
| C0: 2 GEN if archive reading is required | TRIGGERED | NOT_TRIGGERED | TRIGGERED |
| C1: 2 GEN if external publication is required | NOT_TRIGGERED | TRIGGERED | TRIGGERED |
| Derived liability | 2 GEN | 2 GEN | 4 GEN |

The funder deposits 2 GEN twice and both beneficiaries ratify the exact
domain-bound definition. Compilation requires 4 GEN. Removing B2 leaves
mask 3 and requires 2 GEN, crediting 2 GEN surplus to the funder. Selecting
B0 credits C0 exactly 2 GEN. Selecting B2 in a separate unpruned book credits
both beneficiaries 2 GEN each. There is no priority, haircut or debt offset.

[Actual compiled matrix](docs/evidence/studio-dev/semantic-main.json),
[permanent pruning](docs/evidence/studio-dev/lifecycle-main-prune.json),
[surplus delivery](docs/evidence/studio-dev/delivery-main-surplus.json),
[beneficiary delivery](docs/evidence/studio-dev/delivery-main-payee.json),
[canonical final books](docs/evidence/studio-dev/lifecycle-final-state.json).

## Interface and reuse

One `BranchCoverContract`, nine writes, eleven canonical views. Immutable book
terms, distinct parties, fixed controller, review/choice deadlines, append-only
attempts and masks, and per-book own credits provide entity isolation.

| Write | Purpose |
|---|---|
| create_book | Propose two claims and three branches; deposit 1-2 GEN |
| top_up | Actual funder completes margin, 1-2 GEN per transaction |
| ratify | Each named beneficiary authenticates the full definition digest |
| compile_book | Semantic consensus freezes all six activation cells |
| prune_branches | Controller permanently narrows the feasible mask |
| choose_branch | Controller chooses one remaining branch once |
| recover | Registered party returns unallocated reserve to funder at expiry |
| withdraw_credit | Owner debits and withdraws 1-2 GEN of earned own credit |
| close_book | Close a terminal book only after reserve and credits are zero |

Views: get_book, get_claim, get_branch, get_matrix, get_margin, get_attempt,
get_credit, get_accounting, can_choose, get_mask_history and get_policy.
Repeated assent, same-mask pruning and already-closed closure are explicit
no-ops in legal states. Configuration and compiled meaning are immutable.
The branch feasible field records retained-menu membership; use can_choose
for current phase/time eligibility, which becomes false on closure.

Proposed consumers: a LangGraph workflow reservation adapter, an A2A procurement
reservation coordinator and a DAOhaus contingent-budget module. Their shared
path is create/top_up/ratify -> compile -> read margin -> prune/choose -> read
own credit -> withdraw. These are proposed integration paths, not implemented
adapters or adoption claims. No consumer proxy contract is needed.

## Verify locally

Python 3.12 and Node 22, Windows:

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.lock
npm ci
npm run check
```

On Unix use `.venv/bin/python`. First run obtains the pinned GenVM bundle
from official releases. `npm run check` runs recognized-class semantic lint,
`gltest tests/`, metadata, temporal, adversarial, accounting, real SDK calldata
and receipt tests. Latest completed result: **102 Python + 9 script tests pass**.

Tests explicitly replay the validator, reject shape-valid wrong meaning,
hash-valid wrong sender/book binding and payout injection, test every time
gate at -1/equality/+1, and reject accounting corruption and duplicate exits.
All 64 binary matrices and seven masks exhaustively cover bounded reserve
calculation. Local results remain separate from deployed consensus evidence.

## Safety and honest limits

V1 has two claims, three branches, 1-2 GEN per claim, bounded ASCII terms,
three semantic attempts and at most seven days per book. These are internal
protocol-created conditional promises. Choosing a branch does not prove
external work, legal ownership, debt or actual workflow execution. Both
beneficiaries authenticate the full definition through runtime senders;
a hash or signature-looking artifact alone never authorizes assent.

W3C is vocabulary context, not actor identity or payment authority. Its fixed
origin/version/bytes are required before model review. Missing or changed
source stays retryable until review expiry. Consensus is bounded interpretation,
not guaranteed universal accuracy. The co-ratified controller is explicitly
trusted to choose among remaining branches.

Pending books recover at review expiry; compiled unchosen books recover at
choice expiry. Equality is late for ordinary writes. Each temporal entrypoint
checks its own transaction clock. Earned own credits remain withdrawable after
expiry. Every exit uses the EOA/EVM boundary after ledger debit. Evidence must
prove delivered external execution and exact native contract-balance decrease;
parent finality and zero credit alone never prove delivery.

## Evidence

- [Specification and fourteen admission gates](docs/README.md)
- [Deployment identity](docs/evidence/studio-dev/deployment.json)
- [Caller authority smoke](docs/evidence/studio-dev/caller-spoof-smoke.json)
- [Latest local check output](docs/evidence/local/check-latest.txt)
- [Five-book final state](docs/evidence/studio-dev/lifecycle-final-state.json)
- [Fresh source, consensus and native-delivery audit](docs/evidence/studio-dev/lifecycle-audit.json)
- [Safety and reuse review](docs/REVIEW.md)
- [Successful source/test CI](docs/evidence/local/ci-source.json)
- [Unchanged objective acceptance result](docs/evidence/local/acceptance-summary.json)
- [Copy-ready Portal fields](docs/SUBMISSION.md)

No user-facing app, Vercel deployment, browser-wallet workflow, independent
users or Portal acceptance is claimed.

The legacy grader heuristic still prints MISSING custom validator because it
matches only a callback named validator_fn or literal run_nondet(. The deployed
v0.3 code uses the required sandboxed run_nondet_default and a substantive custom
validator. Direct replay, the equal-total beneficiary-swap tripwire, semantic lint
and real independent agreeing executions prove it. No checker or contract was
changed to hide that heuristic gap. The result is a readiness check, not an
accepted Portal contribution or an official points award.

# Verification record

BranchCover is an independently implemented contingent commitment book. Receipt,
network, fee and signed-journal utilities reuse workspace infrastructure; no prior
project's contract, economic state machine, frontend or submission claims are used.

The pinned runtime is GenVM v0.6.0-rc5 / Python API v0.3.0. The linter adapter
recognizes the verified `gl.storage.allow` decorator and sandboxed
`gl.vm.run_nondet_default` spelling without suppressing safety or semantic checks.
The default linter's unpinned runtime resolver did not locate the SDK, so the
wrapper sets the coherent runtime version before invoking the unchanged CLI.

Runner selection was measured rather than assumed from a version tag. On
2026-10-19, the official Studio v0.123-dev Storage template's
`babwp9t37jw9g4j2bccgn14g6x7x9s1f7dsmh7emvz735pz4zxa0` and v2-dev boilerplate's
`9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0` both returned schema
RPC -32603 and simulation errors on Studio Dev. The same official Storage
control with `5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng` recognized
its constructor and simulated SUCCESS. That verified coherent family was then
tested against BranchCover's exact source, semantic lint, direct tests, deployed
schema, constructor and authority smoke. This is an observed runner compatibility
selection, not a network outage or a claim that every newer runner is broken.
No runtime alias or unsafe nondeterministic API was substituted.

References: [official Studio Storage template](https://github.com/genlayerlabs/genlayer-studio/blob/v0.123-dev/examples/contracts/storage.py),
[matched v2-dev boilerplate](https://github.com/genlayerlabs/genlayer-project-boilerplate/tree/816f3b88175032f10242e278c0d13d75f185c882),
[v0.6 migration](https://docs.genlayer.com/developers/consensus-v06-migration).

Direct tests execute production methods against the pinned SDK. Windows fd0 and
the v0.3 text-model wire envelope require platform adapters in `tests/conftest.py`.
The first lazy SDK load leaves upstream actor fixtures as bytes; tests convert
these to the actual SDK Address type after loading. Contract authorization is
unchanged. `vm.run_validator()` explicitly exercises independent semantic replay;
direct leader execution alone is never described as network consensus.

The initial test-first stub failed with `UserError: not implemented`; the saved
RED record is a setup failure, not an assertion failure. The initial implementation
then passed 71 direct/metadata/adversarial cases; two additional safety cases
initially brought the Python total to 73. The completed safety review adds
role/input/mask/amount, time horizon, pending recovery, B1, cross-book conservation
and same-total beneficiary-swap coverage. Current result: 102 Python and nine
script tests pass, with no skips. Actual output is in evidence/local/check-latest.txt.

Canonical evidence is the exact onchain definition and the two beneficiaries'
authenticated ratifications. A hash alone cannot authorize ratification. W3C
ODRL is dated authoritative vocabulary context, fetched at its fixed origin and
checked against exact raw bytes before model invocation. It is never evidence
of external execution. Missing, modified or unavailable source remains retryable.

The earlier viability spike used a JSON transport and a batch of three examples.
Production requests text and rejects duplicate JSON keys before canonicalization.
Its six cell judgments and consequence mapping require their own actual deployed
consensus proof; the earlier unsigned spike cannot substitute for that proof.

Studio Dev's exact-source schema recognizes all 20 methods and its unsigned
constructor returns SUCCESS (see `evidence/studio-dev/runtime-probe.json`).
This remains unsigned compatibility evidence. The historical role preflight
found only one distinct configured account. The owner subsequently approved two
new demo EOAs and exactly 1 GEN funding per EOA. Ignored local configuration
stores the keys; sanitized funding journals prove two successful transfers.
The second transfer's first balance check did not pass; the saved hash and fresh
balances established success, with no repeated funding broadcast.

Deployment is FINALIZED / Result: SUCCESS, exact source/schema matched. The
Explorer transaction and address pages were opened in the in-app browser.
The bounded caller-spoof smoke preserved the actual signer/origin and rejected
the operation with unchanged zero accounting. The full lifecycle and fresh
read-only audit pass: five CLOSED books, 39 operations (37 successes and two
intentional rejects), four semantic reviews, seven native exits and 13 GEN in/out
with zero outstanding accounting and native balance. Repository/CI, Portal
packaging and the final objective gate still require their separate proof.

The first unsigned create-book fee simulation rejected raw strings supplied to
Address-typed arguments. A real SDK encode/decode regression failed, then passed
after adding `CalldataAddress` conversion at the script boundary for create_book
and get_credit. The contract was not changed. Quotes, signed calls and reads now
share that adapter. Two type/validation script tests prove the wire distinction.

The first audit read only consensus_data.leader_receipt. Its representative
validator row for B2 was idle because quorum had already been reached. The SDK
public type declares a separate consensus_data.validators collection; its actual
full collection contained three SUCCESS/agree executions for B2. The audit now
reads that collection, keeping the independent execution requirement. A regression
failed on the old projection and passed after correction. Status or vote labels
alone still cannot count as completed agreement. The final audit found two, two,
two and three completed independent agreeing executions across the four reviews.
Protocol vote maps also include dissent/idle entries. No unanimity or unknown
cause of dissent is claimed. Contract source is unchanged.

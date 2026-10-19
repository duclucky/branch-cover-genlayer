# Verification record

BranchCover is an independently implemented contingent commitment book. Receipt,
network, fee and signed-journal utilities reuse workspace infrastructure; no prior
project's contract, economic state machine, frontend or submission claims are used.

The pinned runtime is GenVM v0.6.0-rc5 / Python API v0.3.0. The linter adapter
recognizes the verified `gl.storage.allow` decorator and sandboxed
`gl.vm.run_nondet_default` spelling without suppressing safety or semantic checks.
The default linter's unpinned runtime resolver did not locate the SDK, so the
wrapper sets the coherent runtime version before invoking the unchanged CLI.

Direct tests execute production methods against the pinned SDK. Windows fd0 and
the v0.3 text-model wire envelope require platform adapters in `tests/conftest.py`.
The first lazy SDK load leaves upstream actor fixtures as bytes; tests convert
these to the actual SDK Address type after loading. Contract authorization is
unchanged. `vm.run_validator()` explicitly exercises independent semantic replay;
direct leader execution alone is never described as network consensus.

The initial test-first stub failed with `UserError: not implemented`; the saved
RED record is a setup failure, not an assertion failure. The initial implementation
then passed 71 direct/metadata/adversarial cases; two additional safety cases
bring the current Python total to 73. Seven script cases include an actual SDK
calldata roundtrip regression. Actual output is in `evidence/local/check-latest.txt`.

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
stores the keys; sanitized role/funding journals prove two successful transfers.
The second transfer's first balance check did not pass; the saved hash and fresh
balances established success, with no repeated funding broadcast.

Deployment is FINALIZED / Result: SUCCESS, exact source/schema matched. The
Explorer transaction and address pages were opened in the in-app browser.
The bounded caller-spoof smoke preserved the actual signer/origin and rejected
the operation with unchanged zero accounting. Live lifecycle execution,
repository/CI, Portal packaging and the final objective gate are still pending.

The first unsigned create-book fee simulation rejected raw strings supplied to
Address-typed arguments. A real SDK encode/decode regression failed, then passed
after adding `CalldataAddress` conversion at the script boundary for create_book
and get_credit. The contract was not changed. Quotes, signed calls and reads now
share that adapter. Two type/validation script tests prove the wire distinction.

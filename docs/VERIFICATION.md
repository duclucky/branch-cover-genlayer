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
RED record is a setup failure, not an assertion failure. The implementation then
passed 71 direct/metadata/adversarial cases. Later changes must refresh this count
from actual `npm run check` output. Live proofs remain pending until recorded.

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
This remains unsigned compatibility evidence. The role preflight found only
one distinct configured authorized account across all three required roles.
No deployment, funding or application-value transaction has been sent for this
project. Live lifecycle execution, public repository/CI, Portal packaging and
the final objective grader remain pending. New beneficiary key creation and
funding require the owner's explicit authorization.

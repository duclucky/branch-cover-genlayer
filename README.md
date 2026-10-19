# BranchCover

BranchCover is a standalone Intelligent Contract for conditional GEN payment
commitments over a finite menu of protocol choices. Independent validators
interpret which conditions each branch activates. Contract code retains enough
GEN to pay every promise on any remaining branch, releases only proven surplus
when branches are permanently removed, and settles one authenticated choice.

Status: contract implementation, local tests and unsigned Studio Dev schema /
constructor checks pass. Live execution is blocked because the three configured
roles all use one account; two independently authorized beneficiaries are needed.
Deployment, lifecycle execution, public CI and submission acceptance remain pending.

This repository is contract-only. The rights are internal protocol commitments;
it does not establish external performance, legal debt or real-world solvency.
See [specification](docs/README.md) for scope, safety, accounting and tests.
See [verification](docs/VERIFICATION.md) and the sanitized
[role preflight](docs/evidence/studio-dev/role-preflight.json) for current proof.

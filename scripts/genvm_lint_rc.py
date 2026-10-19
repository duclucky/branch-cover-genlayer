"""Teach pinned AST analysis the v0.3 sandbox rename; preserve all checks."""
import os
os.environ["GENVM_VERSION"] = "v0.6.0-rc5"
from genvm_linter.lint import safety, structure
safety.SafeEntryPointFinder.SAFE_PATTERNS["gl.vm.run_nondet_default"] = [0, 1]
safety.NONDET_SPAWN_CALLS |= {"gl.vm.run_nondet_default"}
_name = structure.StorageClassChecker._decorator_to_string
def _storage_name(self, node):
    value = _name(self, node)
    return "gl.allow_storage" if value == "gl.storage.allow" else value
structure.StorageClassChecker._decorator_to_string = _storage_name
from genvm_linter.cli import main
if __name__ == "__main__":
    main()

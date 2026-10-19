"""Pinned SDK direct mode with Windows fd0 and fresh-contract isolation.

Only upstream platform/wire adapters are patched; contract rules are executed.
"""
import os
import tempfile
from pathlib import Path
import pytest
from gltest.direct import loader, sdk_loader, wasi_mock
from gltest.direct.vm import VMContext

sdk_loader.CACHE_DIR = Path(__file__).resolve().parents[1] / ".genvm-direct-cache"
sdk_loader.BUNDLE_CACHE_DIR = sdk_loader.CACHE_DIR / "bundles-v2"
sdk_loader.TREE_CACHE_DIR = sdk_loader.CACHE_DIR / "trees-v2"
_llm = wasi_mock._handle_llm_request

def llm_wire(vm, data):
    response = vm._match_llm_mock(data.get("prompt", ""))
    return {"ok": response} if response is not None else _llm(vm, data)

wasi_mock._handle_llm_request = llm_wire
_load = loader._load_module

def fresh_module(path):
    import genlayer.contract as api
    api.__known_contract__ = None
    return _load(path)

loader._load_module = fresh_module
if os.name == "nt":
    _cleanup = VMContext._cleanup_after_deactivate

    def inject(vm):
        from genlayer import calldata
        from genlayer.types import Address
        message = vm.get_message_raw()
        for key in ("contract_address", "sender_address", "origin_address"):
            if isinstance(message[key], bytes):
                message[key] = Address(message[key])
        fd, path = tempfile.mkstemp()
        try:
            os.write(fd, calldata.encode(message))
            os.lseek(fd, 0, os.SEEK_SET)
            vm._original_stdin_fd = os.dup(0)
            os.dup2(fd, 0)
            vm._branchcover_stdin = path
        finally:
            os.close(fd)

    def cleanup(vm):
        try:
            _cleanup(vm)
        finally:
            path = getattr(vm, "_branchcover_stdin", None)
            if path:
                os.unlink(path)
                vm._branchcover_stdin = None

    loader._inject_message_to_fd0 = inject
    VMContext._cleanup_after_deactivate = cleanup

@pytest.fixture
def direct_deploy(direct_vm):
    return lambda path="contracts/branch_cover.py": loader.deploy_contract(
        Path(path).resolve(), direct_vm, sdk_version="v0.6.0-rc5")

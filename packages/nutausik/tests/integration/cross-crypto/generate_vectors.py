#!/usr/bin/env python3
"""Generate known ed25519 test vectors for cross-platform verification.

Output: JSON file with deterministic test vectors that both Python and TS
can verify against each other.

Uses the same RFC 8032 reference implementation as TAUSIK.
"""

import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', '..', 'scripts'))

from crypto_ed25519 import generate_seed, public_from_seed, sign, verify
from crypto_receipt import build_receipt, canonical_bytes
from crypto_keys import fingerprint

def hex(b: bytes) -> str:
    return b.hex()

TEST_SEED = bytes(range(32))  # deterministic: 00 01 02 ... 1f
TEST_MESSAGE = b"TAUSIK cross-platform test message v1"

def generate_vectors():
    # --- RFC 8032 Section 7.1 Test Vector ---
    # From RFC 8032: test vector 1
    rfc_seed = bytes.fromhex(
        "9d61b19deffd5a60ba844af492ec2cc4"
        "4449c5697b326919703bac031cae7f60"
    )
    rfc_message = b""
    rfc_public_expected = bytes.fromhex(
        "d75a980182b10ab7d54bfed3c964073a"
        "0ee172f3daa62325af021a68f707511a"
    )
    rfc_sig_expected = bytes.fromhex(
        "e5564300c360ac729086e2cc806e828a"
        "84877f1eb8e5d974d873e06522490155"
        "5fb8821590a33bacc61e39701cf9b46b"
        "d25bf5f0595bbe24655141438e7a100b"
    )

    # --- TAUSIK-specific test vectors ---
    pub = public_from_seed(TEST_SEED)
    test_sig = sign(TEST_SEED, TEST_MESSAGE)

    vectors = {
        "meta": {
            "description": "Cross-platform ed25519 test vectors for TAUSIK",
            "generated_by": "generate_vectors.py",
        },
        "rfc8032_section_7_1": {
            "seed_hex": hex(rfc_seed),
            "message_hex": hex(rfc_message),
            "expected_public_hex": hex(rfc_public_expected),
            "expected_signature_hex": hex(rfc_sig_expected),
        },
        "tausik_test": {
            "seed_hex": hex(TEST_SEED),
            "message_hex": hex(TEST_MESSAGE),
            "public_hex": hex(pub),
            "signature_hex": hex(test_sig),
            "public_fingerprint": fingerprint(pub),
        },
        "canonical_receipt": {
            "input": {
                "task_slug": "cross-crypto-test",
                "git_sha": "abc123def456",
                "scope": "critical",
                "gates": [
                    {"name": "tsc", "passed": True, "severity": "block"},
                    {"name": "filesize", "passed": True, "severity": "warn"},
                    {"name": "ruff", "passed": True, "severity": "block"},
                ],
                "passed": True,
                "ran_at": "2026-06-25T00:00:00Z",
                "files_hash": "aabbccdd11223344",
                "key_fingerprint": "a1b2c3d4e5f6a7b8",
            },
            "schema": "tausik-receipt/v1",
        },
    }

    # Generate canonical bytes from receipt
    receipt = build_receipt(
        task_slug=vectors["canonical_receipt"]["input"]["task_slug"],
        git_sha=vectors["canonical_receipt"]["input"]["git_sha"],
        scope=vectors["canonical_receipt"]["input"]["scope"],
        gates=vectors["canonical_receipt"]["input"]["gates"],
        passed=vectors["canonical_receipt"]["input"]["passed"],
        ran_at=vectors["canonical_receipt"]["input"]["ran_at"],
        files_hash=vectors["canonical_receipt"]["input"]["files_hash"],
        key_fingerprint=vectors["canonical_receipt"]["input"]["key_fingerprint"],
    )

    receipt_canonical = canonical_bytes(receipt)
    signature_on_receipt = sign(TEST_SEED, receipt_canonical)

    vectors["canonical_receipt"]["canonical_bytes_hex"] = hex(receipt_canonical)
    vectors["canonical_receipt"]["signature_on_receipt_hex"] = hex(signature_on_receipt)
    vectors["canonical_receipt"]["verification"] = verify(pub, receipt_canonical, signature_on_receipt)

    return vectors


if __name__ == "__main__":
    vectors = generate_vectors()
    output_path = os.path.join(
        os.path.dirname(__file__), "test_vectors.json"
    )
    with open(output_path, "w") as f:
        json.dump(vectors, f, indent=2, sort_keys=True)
    print(f"Test vectors written to {output_path}")
    print(f"  RFC 8032 Section 7.1: {len(vectors['rfc8032_section_7_1'])} vectors")
    print(f"  TAUSIK test: seed={vectors['tausik_test']['public_fingerprint']}")
    print(f"  Canonical receipt: {len(vectors['canonical_receipt']['canonical_bytes_hex'])} bytes (hex)")
    print(f"  Receipt signature verifies: {vectors['canonical_receipt']['verification']}")

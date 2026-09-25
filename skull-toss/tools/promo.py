"""Promo codes (v50): the game ships only each code's hash, never the code itself.
   python3 tools/promo.py MORTYBONES          → prints the hash to put in src/promo.json
A code is normalised first (upper case, letters and digits only), then hashed with the same salted cyrb53 the game
uses (09p_general.js). Each entry in src/promo.json: {"hash": "...", "bones": 500} and/or "item": "kind:id",
optionally "until": "YYYY-MM-DD" (the last day it works). A code pays once per player.

v53: the play-test key (everything open) is kept as a PBKDF2-SHA-256 digest instead, a random salt and 310,000
rounds, so the build carries no trace of the code and guessing it is impractical:
   python3 tools/promo.py --master           → asks for the code (it isn't echoed or saved) and replaces the
                                               master entry in src/promo.json"""
import re, sys

SALT = "skulltoss-promo:"


def imul(a, b):
    return ((a & 0xffffffff) * (b & 0xffffffff)) & 0xffffffff


def cyrb53(s, seed=0):
    h1, h2 = 0xdeadbeef ^ seed, 0x41c6ce57 ^ seed
    for ch in s:
        c = ord(ch)
        h1 = imul(h1 ^ c, 2654435761)
        h2 = imul(h2 ^ c, 1597334677)
    h1 = imul(h1 ^ (h1 >> 16), 2246822507) ^ imul(h2 ^ (h2 >> 13), 3266489909)
    h2 = imul(h2 ^ (h2 >> 16), 2246822507) ^ imul(h1 ^ (h1 >> 13), 3266489909)
    return format(4294967296 * (2097151 & h2) + (h1 & 0xffffffff), "x")


def norm(code):
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def promo_hash(code):
    return cyrb53(SALT + norm(code))


def master_entry(code, iters=310000):
    import base64, hashlib, os
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", norm(code).encode(), salt, iters, 32)
    return {"master": base64.b64encode(dk).decode(), "salt": base64.b64encode(salt).decode(), "iter": iters, "all": True}


if __name__ == "__main__":
    if sys.argv[1:2] == ["--master"]:
        import getpass, json, pathlib
        code = getpass.getpass("Master code: ")
        if len(norm(code)) < 8: sys.exit("use 8 or more letters and digits")
        path = pathlib.Path(__file__).resolve().parent.parent / "src" / "promo.json"
        entries = [e for e in json.loads(path.read_text()) if not e.get("master")] + [master_entry(code)]
        path.write_text("[\n" + ",\n".join(" " + json.dumps(e) for e in entries) + "\n]\n")
        print("master key replaced in", path)
    else:
        for c in sys.argv[1:]:
            print(norm(c), promo_hash(c))

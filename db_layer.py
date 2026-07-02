"""
db_layer.py — Transparent database abstraction
Auto-selects Firebase Firestore (cloud) or SQLite (local/intranet)
based on the FIREBASE_CREDENTIALS environment variable.
"""
import os, json, uuid, sqlite3

# ── Optional Firebase ──────────────────────────────────────────────
try:
    import firebase_admin
    from firebase_admin import credentials, firestore as _fs
    _FIREBASE_PKG = True
except ImportError:
    _FIREBASE_PKG = False

_db  = None   # Firestore client — None means use SQLite
_sql = None   # SQLite DB path

# ──────────────────────────────────────────────────────────────────
# Init
# ──────────────────────────────────────────────────────────────────
def init(sqlite_db_path):
    global _db, _sql
    _sql = sqlite_db_path
    cred_json = os.environ.get("FIREBASE_CREDENTIALS")
    if cred_json and _FIREBASE_PKG:
        try:
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred)
            _db = _fs.client()
            print("[db_layer] Firebase Firestore (cloud mode)")
            return
        except Exception as e:
            print(f"[db_layer] Firebase init failed, falling back to SQLite: {e}")
            _db = None
    _init_sqlite()
    print("[db_layer] SQLite (local mode)")


def is_cloud():
    return _db is not None


# ──────────────────────────────────────────────────────────────────
# SQLite helpers
# ──────────────────────────────────────────────────────────────────
def _init_sqlite():
    conn = sqlite3.connect(_sql)
    conn.execute("""CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY, scenario TEXT NOT NULL,
        region TEXT NOT NULL DEFAULT 'Other / Unspecified',
        category TEXT NOT NULL DEFAULT 'Other', at TEXT NOT NULL)""")
    conn.execute("""CREATE TABLE IF NOT EXISTS custom_templates (
        id TEXT PRIMARY KEY, data TEXT NOT NULL, created_at TEXT)""")
    conn.commit()
    conn.close()
    # One-time migration: cases.json → SQLite
    legacy = os.path.join(os.path.dirname(_sql), "cases.json")
    if os.path.exists(legacy):
        try:
            with open(legacy) as f:
                old = json.load(f)
            conn = sqlite3.connect(_sql)
            for c in old:
                conn.execute("INSERT OR IGNORE INTO cases VALUES (?,?,?,?,?)",
                    (c.get("id", str(uuid.uuid4())), c.get("scenario",""),
                     c.get("region","Other / Unspecified"), c.get("category","Other"),
                     c.get("at","")))
            conn.commit(); conn.close()
        except Exception:
            pass
        os.rename(legacy, legacy + ".migrated")
    # One-time migration: custom_templates.json → SQLite
    ctf = os.path.join(os.path.dirname(_sql), "..", "custom_templates.json")
    ctf = os.path.normpath(ctf)
    if os.path.exists(ctf):
        try:
            with open(ctf) as f:
                old_tpls = json.load(f)
            if old_tpls:
                conn = sqlite3.connect(_sql)
                for t in old_tpls:
                    tid = t.get("id", str(uuid.uuid4()))
                    tdata = {k: v for k, v in t.items() if k != "id"}
                    conn.execute("INSERT OR IGNORE INTO custom_templates (id,data,created_at) VALUES (?,?,?)",
                        (tid, json.dumps(tdata), t.get("created_at","")))
                conn.commit(); conn.close()
                os.rename(ctf, ctf + ".migrated")
        except Exception:
            pass


def _conn():
    c = sqlite3.connect(_sql)
    c.row_factory = sqlite3.Row
    return c


# ──────────────────────────────────────────────────────────────────
# Cases
# ──────────────────────────────────────────────────────────────────
def read_cases():
    if _db:
        docs = _db.collection("cases").stream()
        cases = [{"id": d.id, **d.to_dict()} for d in docs]
        return sorted(cases, key=lambda x: x.get("at", ""))
    with _conn() as c:
        rows = c.execute("SELECT id,scenario,region,category,at FROM cases ORDER BY at").fetchall()
        return [dict(r) for r in rows]


def insert_case(entry):
    if _db:
        _db.collection("cases").document(entry["id"]).set({
            "scenario": entry["scenario"], "region": entry["region"],
            "category": entry["category"], "at": entry["at"]
        })
    else:
        with _conn() as c:
            c.execute("INSERT INTO cases (id,scenario,region,category,at) VALUES (?,?,?,?,?)",
                (entry["id"], entry["scenario"], entry["region"], entry["category"], entry["at"]))
            c.commit()


def clear_cases():
    if _db:
        batch = _db.batch()
        for doc in _db.collection("cases").stream():
            batch.delete(doc.reference)
        batch.commit()
    else:
        with _conn() as c:
            c.execute("DELETE FROM cases"); c.commit()


# ──────────────────────────────────────────────────────────────────
# Custom Templates
# ──────────────────────────────────────────────────────────────────
def read_templates():
    if _db:
        docs = _db.collection("custom_templates").stream()
        tpls = [{"id": d.id, **d.to_dict()} for d in docs]
        return sorted(tpls, key=lambda x: x.get("created_at", ""))
    with _conn() as c:
        rows = c.execute("SELECT id,data FROM custom_templates ORDER BY created_at").fetchall()
        result = []
        for r in rows:
            try:
                t = json.loads(r["data"]); t["id"] = r["id"]; result.append(t)
            except Exception:
                pass
        return result


def save_template(tpl):
    tid = tpl.get("id", str(uuid.uuid4()))
    data = {k: v for k, v in tpl.items() if k != "id"}
    if _db:
        _db.collection("custom_templates").document(tid).set(data)
    else:
        with _conn() as c:
            c.execute("INSERT OR REPLACE INTO custom_templates (id,data,created_at) VALUES (?,?,?)",
                (tid, json.dumps(data), data.get("created_at","")))
            c.commit()
    return tid


def delete_template(tid):
    if _db:
        _db.collection("custom_templates").document(tid).delete()
    else:
        with _conn() as c:
            c.execute("DELETE FROM custom_templates WHERE id=?", (tid,)); c.commit()

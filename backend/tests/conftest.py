from types import SimpleNamespace

import pytest


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    """Minimal stand-in for the chainable supabase-py query builder.

    Only implements what core/deps.py actually calls: select().eq()...eq()
    then either single() or maybe_single(), then execute().data.
    """

    def __init__(self, rows: list[dict]):
        self._rows = rows
        self._single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, key, value):
        self._rows = [r for r in self._rows if r.get(key) == value]
        return self

    def in_(self, key, values):
        values = set(values)
        self._rows = [r for r in self._rows if r.get(key) in values]
        return self

    def maybe_single(self):
        self._single = True
        return self

    def single(self):
        self._single = True
        return self

    def execute(self):
        if self._single:
            return FakeResult(self._rows[0] if self._rows else None)
        return FakeResult(list(self._rows))


class FakeTable:
    def __init__(self, rows: list[dict]):
        self._rows = rows

    def select(self, *_args, **_kwargs):
        return FakeQuery(list(self._rows))


class FakeAuth:
    def __init__(self):
        self._users_by_token: dict[str, object] = {}

    def register_user(self, token: str, *, id: str, email: str | None):
        self._users_by_token[token] = SimpleNamespace(id=id, email=email)

    def register_invalid_user(self, token: str):
        """A token that resolves without error but to no user (e.g. expired)."""
        self._users_by_token[token] = None

    def get_user(self, token: str):
        if token not in self._users_by_token:
            raise Exception("invalid or expired token")  # noqa: TRY002
        return SimpleNamespace(user=self._users_by_token[token])


class FakeSupabase:
    def __init__(self):
        self.auth = FakeAuth()
        self._tables: dict[str, list[dict]] = {}

    def seed(self, table: str, rows: list[dict]):
        self._tables[table] = rows

    def table(self, name: str):
        return FakeTable(self._tables.get(name, []))


@pytest.fixture
def fake_supabase(monkeypatch):
    fake = FakeSupabase()
    monkeypatch.setattr("backend.core.deps.get_supabase", lambda: fake)
    return fake

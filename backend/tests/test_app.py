from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from .conftest import register

TODAY = datetime.now(ZoneInfo("Asia/Kolkata")).date()


def day(offset: int) -> str:
    return (TODAY + timedelta(days=offset)).isoformat()


def add_task(client, auth, title="Study", offset=0, planned=2, priority="medium"):
    res = client.post(
        "/api/tasks",
        headers=auth,
        json={"title": title, "task_date": day(offset), "planned_hours": planned, "priority": priority},
    )
    assert res.status_code == 201, res.text
    return res.json()


# ---------- Authentication ----------

def test_register_login_and_me(client):
    register(client, email="A@Example.com")
    res = client.post("/api/auth/login", json={"email": "a@example.com", "password": "correct-horse-9"})
    assert res.status_code == 200
    body = res.json()
    assert "password_hash" not in body["user"]
    me = client.get("/api/users/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["email"] == "a@example.com"


def test_duplicate_email_and_bad_login(client):
    register(client)
    dup = client.post("/api/auth/register", json={"name": "X", "email": "me@example.com", "password": "another-pass-1"})
    assert dup.status_code == 409
    assert client.post("/api/auth/login", json={"email": "me@example.com", "password": "wrong"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "no@example.com", "password": "wrong"}).status_code == 401


def test_validation_on_register(client):
    assert client.post("/api/auth/register", json={"name": "X", "email": "bad", "password": "longenough1"}).status_code == 422
    assert client.post("/api/auth/register", json={"name": "X", "email": "a@b.co", "password": "short"}).status_code == 422


def test_protected_routes_need_a_valid_token(client):
    for path in ["/api/dashboard", "/api/tasks", "/api/history", "/api/stats", "/api/users/me"]:
        assert client.get(path).status_code == 401
        assert client.get(path, headers={"Authorization": "Bearer nonsense"}).status_code == 401


def test_password_change(client, auth):
    bad = client.post("/api/users/me/password", headers=auth, json={"current_password": "nope", "new_password": "brand-new-pass-1"})
    assert bad.status_code == 400
    ok = client.post("/api/users/me/password", headers=auth, json={"current_password": "correct-horse-9", "new_password": "brand-new-pass-1"})
    assert ok.status_code == 204
    assert client.post("/api/auth/login", json={"email": "me@example.com", "password": "brand-new-pass-1"}).status_code == 200


# ---------- Privacy between users ----------

def test_users_cannot_see_or_change_each_others_tasks(client):
    alice = register(client, email="alice@example.com")
    bob = register(client, email="bob@example.com")
    task = add_task(client, alice, title="Alice's secret")

    assert client.get("/api/tasks", headers=bob).json() == []
    assert client.get("/api/dashboard", headers=bob).json()["tasks"] == []
    assert client.patch(f"/api/tasks/{task['id']}", headers=bob, json={"title": "hacked"}).status_code == 404
    assert client.delete(f"/api/tasks/{task['id']}", headers=bob).status_code == 404
    assert client.post(f"/api/tasks/{task['id']}/reschedule", headers=bob, json={"new_date": day(1)}).status_code == 404
    assert client.get("/api/tasks", headers=alice).json()[0]["title"] == "Alice's secret"


# ---------- Tasks ----------

def test_task_crud_and_validation(client, auth):
    task = add_task(client, auth, planned=1.5, priority="high")
    assert task["status"] == "pending" and task["actual_hours"] == 0

    for bad in [{"planned_hours": 0}, {"planned_hours": 25}, {"priority": "urgent"}, {"title": "   "}]:
        payload = {"title": "T", "task_date": day(0), "planned_hours": 1, **bad}
        assert client.post("/api/tasks", headers=auth, json=payload).status_code == 422, bad

    edited = client.patch(f"/api/tasks/{task['id']}", headers=auth, json={"title": "Renamed", "actual_hours": 0.5}).json()
    assert edited["title"] == "Renamed" and edited["status"] == "partial"

    assert client.delete(f"/api/tasks/{task['id']}", headers=auth).status_code == 204
    assert client.get("/api/tasks", headers=auth).json() == []


def test_completing_a_task(client, auth):
    a = add_task(client, auth, planned=2)
    b = add_task(client, auth, planned=1)
    done = client.patch(f"/api/tasks/{a['id']}", headers=auth, json={"is_completed": True}).json()
    assert done["status"] == "completed" and done["actual_hours"] == 2 and done["completed_at"]
    done_b = client.patch(f"/api/tasks/{b['id']}", headers=auth, json={"is_completed": True, "actual_hours": 0.75}).json()
    assert done_b["actual_hours"] == 0.75
    undone = client.patch(f"/api/tasks/{a['id']}", headers=auth, json={"is_completed": False}).json()
    assert undone["status"] == "partial" and undone["completed_at"] is None


# ---------- Dashboard, scoring, streaks ----------

def test_dashboard_numbers(client, auth):
    a = add_task(client, auth, title="A", planned=2)
    b = add_task(client, auth, title="B", planned=2)
    add_task(client, auth, title="C", planned=4)
    client.patch(f"/api/tasks/{a['id']}", headers=auth, json={"is_completed": True, "actual_hours": 1.5})
    client.patch(f"/api/tasks/{b['id']}", headers=auth, json={"actual_hours": 1})

    d = client.get("/api/dashboard", headers=auth).json()
    s = d["summary"]
    assert s["planned_hours"] == 8 and s["actual_hours"] == 2.5
    # credited: A full 2 (completed) + B 1 (partial) + C 0 = 3 of 8
    assert s["score"] == 37.5
    assert (s["completed"], s["partial"], s["pending"], s["missed"]) == (1, 1, 1, 0)
    assert d["message"]["tone"] == "encourage"


def test_score_never_exceeds_100(client, auth):
    a = add_task(client, auth, planned=1)
    client.patch(f"/api/tasks/{a['id']}", headers=auth, json={"actual_hours": 5})
    assert client.get("/api/dashboard", headers=auth).json()["summary"]["score"] == 100


def test_all_done_message(client, auth):
    a = add_task(client, auth)
    client.patch(f"/api/tasks/{a['id']}", headers=auth, json={"is_completed": True})
    d = client.get("/api/dashboard", headers=auth).json()
    assert d["message"]["tone"] == "celebrate" and d["summary"]["score"] == 100 and d["streak"] == 1


def test_streak_counts_consecutive_days_and_today_does_not_break_it(client, auth):
    for offset in (-3, -2, -1):
        t = add_task(client, auth, offset=offset)
        client.patch(f"/api/tasks/{t['id']}", headers=auth, json={"is_completed": True})
    t5 = add_task(client, auth, offset=-5)
    client.patch(f"/api/tasks/{t5['id']}", headers=auth, json={"is_completed": True})
    add_task(client, auth, offset=0)  # today, not done yet

    d = client.get("/api/dashboard", headers=auth).json()
    assert d["streak"] == 3 and d["best_streak"] == 3


def test_missed_tasks_restart_message_and_carry_over(client, auth):
    old = add_task(client, auth, offset=-6)
    client.patch(f"/api/tasks/{old['id']}", headers=auth, json={"is_completed": True})
    missed = add_task(client, auth, title="Missed one", offset=-1)

    d = client.get("/api/dashboard", headers=auth).json()
    assert d["streak"] == 0
    assert d["message"]["tone"] == "restart"
    assert [t["id"] for t in d["carry_over"]] == [missed["id"]]
    assert d["carry_over"][0]["status"] == "missed"


def test_missed_yesterday_message(client, auth):
    done = add_task(client, auth, offset=-1)
    client.patch(f"/api/tasks/{done['id']}", headers=auth, json={"is_completed": True})
    add_task(client, auth, title="Skipped", offset=-1)
    d = client.get("/api/dashboard", headers=auth).json()
    assert d["message"]["tone"] == "encourage" and "resched" in d["message"]["text"].lower() or "another day" in d["message"]["text"] or "new date" in d["message"]["text"]


# ---------- Rescheduling keeps history intact ----------

def test_reschedule_future_untouched_task_just_moves(client, auth):
    t = add_task(client, auth, offset=0)
    moved = client.post(f"/api/tasks/{t['id']}/reschedule", headers=auth, json={"new_date": day(2)}).json()
    assert moved["id"] == t["id"] and moved["task_date"] == day(2)


def test_reschedule_past_task_keeps_the_original_day(client, auth):
    t = add_task(client, auth, title="Essay", offset=-1, planned=3)
    client.patch(f"/api/tasks/{t['id']}", headers=auth, json={"actual_hours": 1})
    before = client.get("/api/history", headers=auth).json()

    new = client.post(f"/api/tasks/{t['id']}/reschedule", headers=auth, json={"new_date": day(1)}).json()
    assert new["id"] != t["id"] and new["planned_hours"] == 2 and new["task_date"] == day(1)

    after = client.get("/api/history", headers=auth).json()
    assert after[0]["summary"] == before[0]["summary"]  # yesterday's record unchanged
    assert after[0]["tasks"][0]["rescheduled_to"] == day(1)

    again = client.post(f"/api/tasks/{t['id']}/reschedule", headers=auth, json={"new_date": day(2)})
    assert again.status_code == 400
    past = client.post(f"/api/tasks/{new['id']}/reschedule", headers=auth, json={"new_date": day(-2)})
    assert past.status_code == 422
    assert client.get("/api/dashboard", headers=auth).json()["carry_over"] == []


# ---------- History and graph data ----------

def test_history_is_newest_first_and_excludes_future(client, auth):
    add_task(client, auth, offset=-2)
    add_task(client, auth, offset=-1)
    add_task(client, auth, offset=3)
    days = [d["summary"]["date"] for d in client.get("/api/history", headers=auth).json()]
    assert days == [day(-1), day(-2)]


def test_stats_ranges(client, auth):
    for offset, complete in [(-200, True), (-20, True), (-3, False), (0, True)]:
        t = add_task(client, auth, offset=offset, planned=2)
        if complete:
            client.patch(f"/api/tasks/{t['id']}", headers=auth, json={"is_completed": True})
    add_task(client, auth, offset=5)

    def points(r):
        res = client.get(f"/api/stats?range={r}", headers=auth)
        assert res.status_code == 200
        return res.json()

    assert len(points("1d")["points"]) == 1 and len(points("1d")["tasks"]) == 1
    assert len(points("1w")["points"]) == 2
    assert len(points("1m")["points"]) == 3
    assert len(points("6m")["points"]) == 3
    assert len(points("1y")["points"]) == 4
    everything = points("all")
    assert len(everything["points"]) == 4 and everything["start"] == day(-200)
    assert everything["summary"]["average_score"] == 75 and everything["summary"]["planned_hours"] == 8
    assert client.get("/api/stats?range=5y", headers=auth).status_code == 422


def test_settings_update(client, auth):
    res = client.patch("/api/users/me", headers=auth, json={"daily_goal_percent": 50, "timezone": "Europe/London", "name": " New "})
    assert res.status_code == 200 and res.json()["daily_goal_percent"] == 50 and res.json()["name"] == "New"
    assert client.patch("/api/users/me", headers=auth, json={"timezone": "Mars/Base"}).status_code == 422
    assert client.patch("/api/users/me", headers=auth, json={"daily_goal_percent": 5}).status_code == 422

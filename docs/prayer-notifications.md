# Feature Requirements: Prayer-Time (Azan) Notifications

Status: Implemented
Last updated: 2026-08-02

## 1. Overview

The bot pushes a short azan alert to a chat the moment one of its selected
prayer times arrives, using the location the chat already saved via
`/pengaturan`. Previously the bot was pull-only (`/jadwal` on demand); this adds
a push channel.

Each chat opts in per prayer through a new `/notifikasi` settings command with
an inline keyboard. Notifications are **off by default** — no existing located
chat is notified until it explicitly turns prayers on.

## 2. Goals / Non-goals

**Goals**
- Deliver a per-prayer alert at (or within a few minutes of) each enabled
  prayer time, in the chat's own timezone.
- Let each chat choose which of the five obligatory prayers it wants.
- Never send the same prayer to the same chat twice on the same day, including
  across process restarts.
- Scale gracefully as the number of located chats grows.

**Non-goals**
- Notifications for Imsak / Terbit / Dhuha (informational times only).
- Pre-prayer reminders ("10 minutes before"), audio azan, or custom text.
- Retrying a failed delivery later (azan is time-sensitive; a late resend is
  not useful).

## 3. Functional requirements

### FR-1 — Per-prayer opt-in
- Available prayers: **Subuh, Dzuhur, Ashar, Maghrib, Isya** (`NOTIFY_PRAYERS`).
- Default state on a new/existing location: all five **off**.

### FR-2 — `/notifikasi` settings command
- If the chat has no saved location → reply prompting `/pengaturan` (same guard
  as `/jadwal`).
- Otherwise show an inline keyboard, one button per prayer, labelled with state:
  `✅ Subuh` (on) / `⬜ Subuh` (off).
- Tapping a button toggles that prayer and re-renders the keyboard in place
  (`editMessageReplyMarkup` + `answerCbQuery`). State persists in MongoDB.
- Callbacks use `callback_data: "notif/<prayer>"`; the `callback_query` handler
  branches on this prefix **before** the existing province/city logic.

### FR-3 — Delivery
- A per-minute scheduler checks every chat that has at least one prayer enabled.
- For each enabled prayer whose time has arrived within the grace window and has
  not already been sent today, send one message:
  ```
  🕌 Waktu Maghrib telah tiba
  Kota Jakarta — 17:58
  Sabtu, 02 Agustus 2026

  Selamat menunaikan salat.
  ```
  (`parse_mode: HTML`, web preview disabled — same options as `/jadwal`.)

### FR-4 — Timezone correctness
- Each chat's timezone is derived from its stored coordinates via `geo-tz`
  (`find(lat, lng)[0]`), matching the existing `/jadwal` path. Indonesia spans
  WIB/WITA/WIT and has no DST, so a single per-minute tick serves all zones.

### FR-5 — No duplicate delivery
- A DB-backed ledger (`last_notified_date`, `notified_today[]`) records which
  prayers were sent today. A prayer already in the ledger is skipped. The ledger
  resets when the date rolls over in the chat's timezone.
- Because the ledger lives in MongoDB, a `pm2` restart mid-day never resends.

### FR-6 — Grace window
- A prayer fires when `0 ≤ (now − prayerTime) ≤ GRACE_MINUTES` (default **3**
  minutes), not on exact equality. This tolerates a skipped/late tick or a short
  restart, while the upper bound prevents firing a stale prayer hours later.

## 4. Non-functional requirements

### NFR-1 — Delivery throughput / rate limiting
- Telegram caps bots at ~30 messages/second globally; a whole timezone comes due
  in the same minute. Sends are routed through a rate-limited queue
  (`SEND_INTERVAL_MS = 40` → ~25 msg/s). The grace window further spreads the
  burst across ticks.

### NFR-2 — Per-tick cost
- The dominant cost (`getPrayer` reads + parses a whole-year JSON file) is cached
  per coordinate per day (`scheduleCache`). Timezone lookups are cached per
  coordinate (`tzCache`). Net: the expensive work runs once per city per day, not
  once per chat per minute.
- `getActiveLocations()` queries only opted-in chats, bounding the working set.

### NFR-3 — Fault isolation
- Each per-chat iteration and each send is wrapped in try/catch. A blocked bot
  or kicked-from-group error (Telegram 403), or a bad record, is logged and does
  not stop the loop for other chats.

### NFR-4 — Logging
- `mongoose` query logging is gated behind `MONGO_DEBUG=true` (previously always
  on) so the per-minute scan does not flood logs.

## 5. Data model

`model/LocationsModel.js` (`location` collection) gains:

| Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `notifications.subuh` … `.isya` | Boolean | `false` | Per-prayer opt-in flags |
| `last_notified_date` | String | `""` | `yyyy-M-D` of the last send, in the chat's tz |
| `notified_today` | [String] | `[]` | Prayer names already sent on `last_notified_date` |

Existing documents read these as defaults (all off), so no migration is needed.

## 6. Key components

| File | Change |
| --- | --- |
| `model/LocationsModel.js` | New `notifications` + ledger fields |
| `service/LocationsService.js` | `getActiveLocations()`, `toggleNotification()`, `markNotified()` |
| `index.js` | `/notifikasi` command, `notif/` callback branch, scheduler + throttle queue + helpers, `NOTIFY_PRAYERS`/`PRAYER_LABELS` |
| `lib/db.js` | Gate `mongoose.set('debug', …)` behind `MONGO_DEBUG` |
| `package.json` | Add `node-cron` |

Config: optional env var `MONGO_DEBUG=true` to re-enable query logging.

## 7. Edge cases

- **No location** → `/notifikasi` prompts `/pengaturan`; the scheduler never
  touches the chat (it isn't opted in).
- **Missing prayer data for today** → the tick skips that chat for this tick
  (`times` is `null`).
- **Long downtime** past the grace window → the prayer is not sent late (by
  design); the next prayer resumes normally.
- **Bot blocked / removed from group** → 403 is logged; other chats unaffected.
  (Optional future enhancement: auto-disable that chat's notifications on 403.)
- **Cache growth** → `scheduleCache` is cleared if it exceeds 2000 entries;
  `tzCache` is unbounded but constant-per-coordinate and tiny in practice.

## 8. Verification

Automated decision check (run against real dataset during development):
`getPrayer` for a Jakarta coordinate returns today's `time` with all five
prayer keys as `HH:MM`, and the grace-window/dedup decision fires exactly at
`maghrib` and `maghrib+3`, but not at `maghrib+4`, `maghrib−1`, or when already
sent. All cases passed.

Manual end-to-end:
1. `/pengaturan` to set a location, then `/notifikasi` — keyboard renders all
   `⬜`; tapping toggles `✅` in place and survives re-running `/notifikasi`.
2. Point a test chat at a city whose next prayer is ~1–2 min away (or lengthen
   `GRACE_MINUTES`) → exactly one azan message arrives; `notified_today` records
   it; subsequent ticks and a restart produce no repeat.
3. Use a blocked/invalid chat → the tick logs the 403 and keeps serving others.

## 9. Deferred (only if the bot grows to tens of thousands of chats)

- Replace the per-minute scan with a next-prayer priority queue.
- Shard the scan across worker processes.
- Auto-disable notifications for chats that return 403.

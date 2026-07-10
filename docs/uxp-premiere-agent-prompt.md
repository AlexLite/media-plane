# Premiere Pro UXP: Plane timecode review plugin

Build a production-oriented Adobe Premiere Pro UXP panel that connects one active Premiere sequence to one Plane work item.

## Goal

The panel reads the work item's comment stream, renders semantic Plane timecodes as a checklist, and creates/removes sequence markers. It must let an editor reply to the work item and update its status.

## Plane contract

- Authenticate with a Plane personal access token stored using UXP secure storage; never store a password.
- The user selects and persists a mapping: `Premiere sequence ID -> Plane base URL, workspace slug, project ID, work item ID`.
- Read the normal work-item and comment endpoints. Comments are a flat stream, not nested replies.
- Comments expose `comment_html` and a computed field:

  ```json
  "timecodes": [{ "value": "00:01:23", "seconds": 83 }]
  ```

- Treat `timecodes` as authoritative. Fall back to parsing only spans of the form `<span data-plane-timecode="HH:MM:SS">` from `comment_html` for older servers.
- Send normal Plane comment payloads when replying; do not invent a private API.

## Timecode semantics

- Accepted values are `MM:SS` and `HH:MM:SS`; seconds and minutes are 00-59.
- Plane has no frame-rate field. Resolve seconds against the active Premiere sequence's own timebase/FPS when creating a marker.
- Do not mutate Plane timecodes based on sequence FPS.
- If a timecode is beyond sequence duration, show a non-blocking warning and leave it unchecked.

## Marker behaviour

- A checked item means its matching marker is absent from the sequence.
- An unchecked item means a marker should exist at the timecode.
- Persist Plane comment ID and timecode in marker metadata/comment so markers can be reconciled after panel restart.
- Marker name: Plane issue identifier plus timecode. Marker comment: comment author, original timecode, and a short text excerpt.
- Only delete markers whose metadata identifies this plugin and exact Plane comment/timecode pair. Never delete unrelated markers.
- Make writes idempotent: refresh/reconcile must not duplicate markers.

## UI

- Connection screen: Plane URL/token validation, project/work-item selection, and active-sequence binding.
- Review screen: sequence name, linked issue ID/title/state, refresh action, status selector, comment composer, and timecode checklist grouped by comment.
- Show loading, API/auth error, no-active-sequence, unmapped-sequence, and out-of-range states.
- Keep the UI responsive; network calls must not block Premiere operations.

## Engineering requirements

- TypeScript, UXP-compatible APIs, no Node-only runtime assumptions.
- Separate Plane client, mapping persistence, timecode parser, marker reconciliation, and UI state into testable modules.
- Add unit tests for timecode parsing, API fallback parsing, marker identity serialization, and idempotent reconciliation.
- Document local UXP Developer Tool setup, required Premiere version, token setup, and a manual test checklist.
- Do not implement OAuth, webhooks, background polling, or nested comment replies in the first version.

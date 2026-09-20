# Premiere Pro UXP: Plane ↔ FreeFrame review panel

Build a production-oriented Adobe Premiere Pro UXP panel for the Plane ↔ FreeFrame review workflow.

This specification replaces the old Plane-comments-only plugin design. Plane remains the system of record for identity, permissions, projects, and work items. FreeFrame is the media-review service and the source of truth for assets, versions, processing state, playback metadata, frame-accurate comments, and review state.

Related operational and architecture documents:

- [Plane ↔ FreeFrame staging deployment](./freeframe-review-deployment.md);
- [FreeFrame Media Plane Review architecture](https://github.com/AlexLite/freeframe-media-plane-review/blob/integration/plane-review/docs/architecture/media-plane-review.md).

## Goal

An editor should be able to stay in Premiere Pro and:

1. authenticate through Plane;
2. bind the active Premiere sequence to one Plane work item;
3. select an existing FreeFrame asset or create and link a new one;
4. export and upload the active sequence as the first or next review version;
5. follow upload, processing, ready, and failed states;
6. convert FreeFrame review comments to sequence markers;
7. add comments and synchronize comment resolution state.

The workflow should be functionally comparable to the core Premiere review loop in Frame.io. It is not a pixel-for-pixel copy and must use the Plane and FreeFrame design systems and terminology.

## System boundary

```text
Premiere Pro UXP
        |
        | Plane user authentication
        v
Plane API
        |
        | short-lived, issue-bound integration token
        v
FreeFrame Plane Review API
        |
        +-- PostgreSQL: assets, versions, comments, review state
        +-- Redis/worker: processing jobs
        +-- S3/MinIO: multipart uploads and generated media
```

### Plane owns

- user authentication and membership;
- workspace, project, and work-item selection;
- Guest, Member, and Admin permission evaluation;
- the one-work-item-to-one-FreeFrame-asset link;
- issuance of short-lived scoped integration tokens.

### FreeFrame owns

- assets and media versions;
- multipart upload and processing state;
- playback and structured timing metadata;
- public review comments, replies, annotations, and resolution state;
- review status and version history.

### Premiere UXP owns

- the local active-sequence binding;
- export initiation and local export progress;
- upload progress for the current session;
- idempotent reconciliation between FreeFrame comments and Premiere markers.

The plugin must not become a second source of truth for Plane links or FreeFrame review data.

## Identity and security

- Authenticate the user only through Plane. A Plane personal access token may be used for the first implementation and must be stored in UXP secure storage; never store a password.
- Never send the Plane credential to FreeFrame.
- Never store a FreeFrame application token, integration secret, normal FreeFrame JWT, or presigned object-storage URL.
- Request a short-lived integration token from Plane for the selected work item, then exchange it for a scoped FreeFrame session.
- Keep the FreeFrame session in memory and renew it through Plane when it expires. Do not persist it across Premiere restarts.
- Require exact issuer, audience, expiry, workspace, project, work-item, user, asset-link, and scope validation on the server.
- Use only the scopes returned by the server: `review:read`, `review:comment`, `review:upload`, and `review:manage`.
- Render controls from returned permissions. Do not hardcode capabilities from Plane role names in the plugin.
- Fail closed on a wrong secret, expired token, forbidden work-item context, mismatched asset link, insufficient scope, or unexpected FreeFrame origin.

## Plane-facing contract

Use the existing work-item-scoped Plane endpoints as the authoritative entry point:

```text
GET    /api/workspaces/{workspace}/projects/{project}/issues/{issue}/freeframe-review-session/
PUT    /api/workspaces/{workspace}/projects/{project}/issues/{issue}/freeframe-review-session/
DELETE /api/workspaces/{workspace}/projects/{project}/issues/{issue}/freeframe-review-session/
GET    /api/workspaces/{workspace}/projects/{project}/issues/{issue}/freeframe-review-assets/
POST   /api/workspaces/{workspace}/projects/{project}/issues/{issue}/freeframe-review-assets/
```

Required behavior:

- `GET .../freeframe-review-session/` returns the linked asset ID, short-lived integration token, TTL, and management capability.
- An unlinked work item returns a controlled unlinked state, not an empty synthetic asset.
- `GET .../freeframe-review-assets/` searches the scoped FreeFrame catalog through Plane.
- `POST .../freeframe-review-assets/` creates an asset through Plane without exposing a FreeFrame credential.
- `PUT .../freeframe-review-session/` links the selected asset both in FreeFrame and Plane; it must reject an asset linked to another work item.
- `DELETE .../freeframe-review-session/` unlinks remotely first and removes the Plane projection only after FreeFrame confirms success.

The UXP client must not call ordinary Plane comment endpoints for media review comments and must not parse semantic timecodes from Plane work-item discussion.

### Public FreeFrame endpoint discovery

The plugin must not require the user to type or persist a FreeFrame URL. Before implementation, the Plane contract must provide one of these server-controlled options:

1. a browser/UXP-reachable FreeFrame integration API base URL in the session response; or
2. Plane BFF endpoints that proxy all review operations.

The selected URL must come from trusted Plane configuration and must never be accepted from work-item content or arbitrary plugin input.

## FreeFrame review contract

After receiving the Plane-issued integration token, exchange it through:

```text
POST /integrations/plane/session
```

Use the returned short-lived FreeFrame access token only for the immutable Plane context and linked asset. The current review surface includes:

```text
GET  /integrations/plane/assets/{asset}/review
GET  /integrations/plane/assets/{asset}/stream

POST /integrations/plane/assets/{asset}/versions
POST /integrations/plane/assets/{asset}/versions/{version}/upload/presign-part
POST /integrations/plane/assets/{asset}/versions/{version}/upload/complete
POST /integrations/plane/assets/{asset}/versions/{version}/upload/abort

GET  /integrations/plane/assets/{asset}/versions/{version}/comments
POST /integrations/plane/assets/{asset}/versions/{version}/comments
POST /integrations/plane/assets/{asset}/comments/{comment}/resolve
```

Do not add a parallel Premiere-only authentication or media API. Extend the shared Plane Review API when the plugin needs missing data.

## Sequence binding

Persist only this non-secret mapping locally:

```text
Premiere project ID + sequence ID
    -> Plane base URL
    -> workspace slug
    -> project ID
    -> work-item ID
```

- Treat the server-side Plane ↔ FreeFrame link as authoritative; do not persist an asset ID as the source of truth.
- On every panel start or sequence switch, resolve the work item through Plane and reload its current FreeFrame link.
- Detect duplicated or replaced Premiere sequences and require explicit rebinding when a stable sequence identity cannot be proven.
- Allow the user to disconnect the local sequence mapping without unlinking the Plane asset.
- Expose server-side unlink only to a user with `review:manage` and require explicit confirmation.

## Asset selection and linking

For an unlinked work item:

1. show catalog search when the user can manage the link;
2. allow selection of an existing compatible asset;
3. allow creation of a new `video` asset using the sequence name as an editable default;
4. link the asset through Plane;
5. reload the session and verify that Plane and FreeFrame return the same work-item context and asset ID.

Do not optimistically display a successful link before both services confirm it. A conflict because the asset belongs to another work item must remain a visible, non-destructive error.

## Export and version upload

- The target flow is direct export and upload from the UXP panel.
- Use Premiere-supported export APIs and an explicit export preset. Show the output path, format, estimated size when available, and export progress.
- If the required Premiere version cannot initiate export through UXP, allow the user to select an already exported media file as a documented compatibility fallback. This fallback does not replace the target direct-export flow.
- Upload the exported file as the first version of a newly linked asset or the next version of an existing asset.
- Use FreeFrame multipart initiation, presigned part upload, completion, and best-effort abort. Preserve part ordering and ETags.
- Keep presigned URLs in memory only and never log them.
- Show separate `exporting`, `uploading`, `processing`, `ready`, `failed`, and `cancelled` states.
- Poll only the scoped review bootstrap/version state with bounded backoff. Stop polling on terminal state, panel disposal, sequence change, or authentication failure.
- Do not report success until FreeFrame returns `ready` and playback metadata is available.
- A failed upload must not replace the current ready version or leave the UI linked to an incomplete version.

The browser/UXP-reachable S3 or MinIO endpoint must preserve the host used in presigned URLs, allow the required multipart methods, and expose `ETag`. Never use wildcard CORS in production.

## Review comments and Premiere markers

- FreeFrame review comments are authoritative. Ordinary Plane comments are not media-review comments.
- A comment is scoped to an exact FreeFrame asset version.
- The target timing contract uses canonical `frame_number`, rational FPS, optional range end, and version ID.
- Do not use display timecode as the canonical identifier and do not parse Plane text spans as a fallback.
- Until the shared API exposes canonical frame fields, isolate any conversion from the current FreeFrame time value in a compatibility adapter with tests; do not leak that representation into marker identity.
- Marker identity must include provider, FreeFrame asset ID, version ID, comment ID, and canonical frame/range.
- Marker name should include the Plane work-item identifier and review version. Marker comment should contain author, review text excerpt, and immutable FreeFrame comment ID.
- Reconciliation must be idempotent: refresh or panel restart must not create duplicate markers.
- Delete or move only markers whose metadata identifies this plugin and exact comment/version pair. Never modify unrelated Premiere markers.
- A resolved FreeFrame comment should have a distinct marker state. Resolving or reopening it from Premiere must update FreeFrame and then reconcile the local marker from the server response.
- If a comment position is outside the active sequence duration or uses incompatible version timing, show a warning and do not create a misleading marker.

## UI/UX

Use a compact Premiere-native panel with these states:

### Connection

- Plane URL and secure token setup;
- token validation and current user identity;
- no-active-project and no-active-sequence errors.

### Work-item binding

- workspace, project, and work-item selection;
- active sequence name;
- current Plane work-item identifier, title, and state;
- local bind/disconnect controls.

### Asset link

- linked asset summary and current version;
- existing asset search;
- create-and-link flow;
- explicit unlink for authorized users;
- conflict and unavailable-service states.

### Upload

- export preset and output summary;
- `Export and upload` primary action;
- progress separated into export, upload, and processing stages;
- version history with current/ready/failed state;
- retry that creates or resumes only a valid server-supported operation.

### Review

- selected version and sequence name;
- comments grouped by version and ordered by frame;
- marker synchronization status;
- comment composer at the current playhead;
- resolve/reopen action;
- refresh and session-expired recovery.

Keep network work asynchronous and cancellation-aware. Premiere timeline operations must remain responsive during export, upload, polling, and reconciliation.

## Engineering requirements

- TypeScript and UXP-compatible APIs; no Node-only runtime assumptions.
- Provide a valid UXP manifest, package scripts, and a reproducible development package.
- Separate Plane client, FreeFrame review client, secure credential storage, sequence mapping, export controller, multipart uploader, timing adapter, marker reconciliation, and UI state into testable modules.
- Validate all external payloads before use and surface correlation-safe errors without secrets, credentials, presigned URLs, or user media paths.
- Add unit tests for mapping identity, session renewal, upload part ordering, ETag handling, abort behavior, timing conversion, marker identity, idempotent reconciliation, and permission gating.
- Add contract tests against the Plane and FreeFrame integration schemas.
- Document UXP Developer Tool setup, supported Premiere versions, installation, Plane token creation, export presets, and troubleshooting.
- Keep the plugin source in a dedicated package or repository; do not place generated `.ccx`, build output, credentials, or exported media in Git.

## MVP acceptance checklist

- Authenticate through Plane; no FreeFrame credential is configured in the plugin.
- Bind an active sequence to a Plane work item and restore the mapping after Premiere restart.
- Search and link an existing FreeFrame asset.
- Create and link a new FreeFrame video asset.
- Reject an asset already linked to another work item.
- Export/select media and upload the first version.
- Upload a subsequent version to the same asset.
- Observe `uploading → processing → ready` and verify playback in Plane/FreeFrame.
- Pull comments for the selected version and create frame-correct Premiere markers.
- Add a comment at the current playhead and see it in normal FreeFrame review.
- Resolve and reopen a comment without duplicating markers.
- Verify server-returned Guest, Member, and Admin capabilities.
- Fail closed for expired/invalid sessions, forbidden Plane context, unavailable Plane or FreeFrame API, unavailable worker/storage, interrupted multipart upload, and insufficient permissions.
- Never expose secrets, access tokens, presigned URLs, or unrelated Premiere markers in logs or persisted state.

## Non-goals for the first version

- a standalone FreeFrame login inside Premiere;
- long-lived FreeFrame credentials;
- mirroring review comments into ordinary Plane discussion;
- treating parsed Plane timecodes as review positions;
- DAM/archive management;
- background synchronization while Premiere or the panel is closed;
- pixel-perfect reproduction of Frame.io branding;
- automatic production deployment or distribution through Adobe Marketplace.

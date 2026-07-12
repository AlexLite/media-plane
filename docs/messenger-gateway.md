# Plane Messenger Gateway

`services/plane-messenger-gateway` is an optional sidecar service for the
Plane stack. It currently enables the VK adapter only; it does not modify Plane
frontend, backend, web, API, or database schema.

## Configuration

Create `services/plane-messenger-gateway/.env` from its `.env.example` and set
the required notifier secrets. Keep this file local: it is ignored by Git.

The service keeps its own SQLite data in the named volume
`plane-messenger-gateway-data`. Never copy that data between instances.

## Plane webhook URL

Do not configure Plane with `http://127.0.0.1:8083/plane/webhook`. Inside the
Plane worker container, `127.0.0.1` points back to the worker itself.

Use the gateway service name on the shared Docker network:

```text
http://plane-messenger-gateway:8083/plane/webhook
```

Plane blocks private and loopback webhook targets by default as SSRF
protection. The Compose overlay therefore adds this exact Docker hostname to
`WEBHOOK_ALLOWED_HOSTS` for both `api` and `worker`:

- `api` needs it when the webhook is created or edited;
- `worker` needs it again when the webhook is delivered.

This trusts only the gateway hostname and does not allow an entire private
network.

## Start

From the repository root, start or recreate Plane API, worker, and gateway with
the optional overlay:

```bash
docker compose \
  -f docker-compose.yml \
  -f docker-compose.messenger-gateway.yml \
  up -d --build api worker plane-messenger-gateway
```

The gateway is also published on host loopback at port `8083` by default. That
mapping is for a host-level reverse proxy and local health checks; it is not the
URL Plane should use.

Set `PLANE_MESSENGER_GATEWAY_PORT` only when another host-loopback port is
required. Publish `/vk/callback` through a public reverse proxy for VK. Keep
`/admin/*` private. The Plane `/plane/webhook` endpoint can remain internal on
the Docker network.

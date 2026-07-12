# Plane Messanger Gateway

`services/plane-messanger-gateway` is an optional Plane sidecar. It currently supports the VK adapter.

## Security

The container starts through `app.secure_entrypoint`, which refuses to start when `ADMIN_TOKEN`, `PLANE_WEBHOOK_SECRET`, or `VK_CALLBACK_SECRET` is empty, left as a placeholder, or too short.

The root Compose overlay publishes the gateway only on host loopback. That mapping is intended for a host-level reverse proxy and local health checks. Keep `/admin/*` private and publish only `/vk/callback` when VK needs public access.

Generate independent random secrets. Do not reuse Plane's `SECRET_KEY` as the notifier token encryption key.

The gateway currently reads Plane data directly and can create Plane API tokens. Use a database account with the minimum required permissions and review this integration after Plane schema upgrades.

## Plane webhook routing

Plane must not use `127.0.0.1` as the webhook target because the webhook is sent by the Plane worker container. Use Docker service discovery instead:

```text
http://plane-messanger-gateway:8083/plane/webhook
```

Plane's SSRF protection rejects private targets unless explicitly trusted. The root overlay sets:

```text
WEBHOOK_ALLOWED_HOSTS=plane-messanger-gateway
```

for both `api` and `worker`. The API validates the URL when it is saved, and the worker validates it again immediately before delivery.

## Start

```bash
cp services/plane-messanger-gateway/.env.example services/plane-messanger-gateway/.env
# Replace all secret placeholders before continuing.
docker compose \
  -f docker-compose.yml \
  -f docker-compose.messanger-gateway.yml \
  up -d --build api worker plane-messanger-gateway
```

Health check from the Docker host:

```bash
curl http://127.0.0.1:8083/health
```

`app/asgi.py` contains the active implementation. `app/main.py` is only a compatibility wrapper, so security logic is not duplicated across two applications.

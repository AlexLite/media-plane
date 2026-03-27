# Plane RU Localization — State Document

> **Единственный источник правды** для поддержки русской локализации Plane.
> Обновляй этот файл при каждом значимом изменении.

---

## Текущее состояние

| Параметр         | Значение                                               |
| ---------------- | ------------------------------------------------------ |
| Upstream версия  | `d94a2694` (preview, 2026-03-25)                       |
| Наша ветка       | `feat/ru-l10n-bootstrap-2026-03-21`                    |
| Покрытие RU      | ~100% (translations, core, accessibility, empty-state) |
| Последний деплой | 2026-03-27                                             |
| Сервер           | `dev@10.0.100.201`                                     |

## Файлы, которыми мы владеем

Эти файлы — **единственное**, что отличает нас от upstream.
Не трогай другие файлы без крайней необходимости.

```
packages/i18n/src/locales/ru/
├── translations.ts     ← основной файл (~2720 ключей)
├── core.ts             ← sidebar, navigation (~257 ключей)
├── accessibility.ts    ← ARIA-метки (~29 ключей)
├── empty-state.ts      ← пустые состояния (~137 ключей)
└── editor.ts           ← редактор (пока пустой)

apps/api/plane/settings/storage.py   ← патч MinIO presigned URLs
```

## Docker-образы на сервере

| Образ                                         | Назначение                  |
| --------------------------------------------- | --------------------------- |
| `plane-frontend-ru:i18n-invitations-20260325` | Frontend с RU переводами    |
| `plane-backend-ru:v1.2.3-storage-fix`         | Backend с патчем storage.py |

Официальные образы Plane используются как base, мы добавляем только наш слой.

### Dockerfile.api (сервер: `/home/dev/plane-selfhost/Dockerfile.api-ru`)

```dockerfile
FROM artifacts.plane.so/makeplane/plane-backend:v1.2.3
COPY storage_patched.py /code/plane/settings/storage.py
```

## Workflow: синхронизация с upstream

```bash
# 1. Обновиться
./scripts/sync-upstream.sh

# Скрипт автоматически:
# - git fetch upstream
# - git rebase upstream/preview
# - восстанавливает наши ru/ файлы и storage.py
# - запускает аудит новых ключей

# 2. Если есть новые ключи — добавить перевод
# Редактируй ТОЛЬКО файлы из раздела "Файлы, которыми мы владеем"

# 3. Пересобрать образ frontend
ssh dev@10.0.100.201 "cd /home/dev/plane-selfhost && \
  docker build -f Dockerfile.web-ru -t plane-frontend-ru:$(date +%Y%m%d) . && \
  cd plane-app && docker compose up -d web"

# 4. Пересобрать образ backend (только если менялся storage.py)
ssh dev@10.0.100.201 "cd /home/dev/plane-selfhost && \
  docker build -f Dockerfile.api-ru -t plane-backend-ru:v1.2.3-storage-fix . && \
  cd plane-app && docker compose up -d api worker beat-worker"
```

## Workflow: аудит переводов

```bash
# Полный аудит
node scripts/audit-keys.mjs

# Только пропущенные ключи (нет в RU вообще)
node scripts/audit-keys.mjs --missing

# Только потенциально непереведённые (RU == EN)
node scripts/audit-keys.mjs --untranslated

# Только осиротевшие (есть в RU, нет в EN)
node scripts/audit-keys.mjs --extra
```

## Правила для AI-сессий

Когда просишь AI помочь с переводом, **всегда указывай**:

1. Редактировать только файлы из раздела "Файлы, которыми мы владеем"
2. НЕ трогать upstream-файлы (компоненты, страницы, API)
3. НЕ добавлять ключи в EN-файлы без необходимости
4. Перед работой запустить `node scripts/audit-keys.mjs` и работать по его выводу
5. После работы снова запустить аудит — убедиться что missing = 0

## История значимых изменений

| Дата       | Изменение                                                        |
| ---------- | ---------------------------------------------------------------- |
| 2026-03-21 | Первоначальный bootstrap RU локализации                          |
| 2026-03-25 | Перевод страницы workspace-invitations                           |
| 2026-03-25 | Исправление Mixed Content (storage.py MinIO URLs)                |
| 2026-03-27 | Исправление 403 Forbidden (dual boto3 client для presigned URLs) |
| 2026-03-27 | Добавлен скрипт аудита и workflow синхронизации                  |

## Известные нюансы

- **HTTPS termination**: Keenetic роутер принимает HTTPS, отдаёт HTTP на `10.0.100.201`.
  `MINIO_SERVER_URL=https://plane.pikuloki.keenetic.link` обязательно в `.env` (не только в `plane.env`).
- **docker-compose.override.yml**: Без него `docker compose up` перезаписывает наши образы официальными.
- **Presigned URLs**: AWS4 подписи привязаны к хосту. `s3_presign_client` использует публичный endpoint,
  `s3_client` — внутренний `http://plane-minio:9000`.

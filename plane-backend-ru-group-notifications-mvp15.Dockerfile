FROM plane-backend-ru:v1.3.1-pipeline-mvp14-default-due-refresh

COPY apps/api/plane/db/models/workspace_group.py /code/plane/db/models/workspace_group.py
COPY apps/api/plane/db/models/__init__.py /code/plane/db/models/__init__.py
COPY apps/api/plane/db/migrations/0134_workspace_group_notification_rule.py /code/plane/db/migrations/0134_workspace_group_notification_rule.py
COPY apps/api/plane/app/serializers/workspace_group.py /code/plane/app/serializers/workspace_group.py
COPY apps/api/plane/app/serializers/__init__.py /code/plane/app/serializers/__init__.py
COPY apps/api/plane/api/views/workspace_group.py /code/plane/api/views/workspace_group.py
COPY apps/api/plane/api/views/__init__.py /code/plane/api/views/__init__.py
COPY apps/api/plane/api/urls/workspace_group.py /code/plane/api/urls/workspace_group.py
COPY apps/api/plane/app/urls/workspace_group.py /code/plane/app/urls/workspace_group.py
COPY apps/api/plane/bgtasks/notification_task.py /code/plane/bgtasks/notification_task.py

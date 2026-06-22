FROM plane-backend-ru:v1.3.1-state-i18n13

COPY apps/api/plane/db/models/workspace_group.py /code/plane/db/models/workspace_group.py
COPY apps/api/plane/db/models/__init__.py /code/plane/db/models/__init__.py
COPY apps/api/plane/db/migrations/0124_workspace_group.py /code/plane/db/migrations/0124_workspace_group.py
COPY apps/api/plane/db/migrations/0125_workspace_group_member.py /code/plane/db/migrations/0125_workspace_group_member.py
COPY apps/api/plane/db/migrations/0126_workspace_group_emoji.py /code/plane/db/migrations/0126_workspace_group_emoji.py
COPY apps/api/plane/db/migrations/0127_workspace_group_emoji_length.py /code/plane/db/migrations/0127_workspace_group_emoji_length.py
COPY apps/api/plane/app/serializers/workspace_group.py /code/plane/app/serializers/workspace_group.py
COPY apps/api/plane/app/serializers/__init__.py /code/plane/app/serializers/__init__.py
COPY apps/api/plane/api/views/workspace_group.py /code/plane/api/views/workspace_group.py
COPY apps/api/plane/api/views/__init__.py /code/plane/api/views/__init__.py
COPY apps/api/plane/api/urls/workspace_group.py /code/plane/api/urls/workspace_group.py
COPY apps/api/plane/api/urls/__init__.py /code/plane/api/urls/__init__.py
COPY apps/api/plane/app/urls/workspace_group.py /code/plane/app/urls/workspace_group.py
COPY apps/api/plane/app/urls/__init__.py /code/plane/app/urls/__init__.py

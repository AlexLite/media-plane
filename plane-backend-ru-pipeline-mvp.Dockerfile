FROM plane-backend-ru:v1.3.1-workspace-groups-emoji-picker1

COPY apps/api/plane/db/models/issue.py /code/plane/db/models/issue.py
COPY apps/api/plane/db/models/state.py /code/plane/db/models/state.py
COPY apps/api/plane/db/models/__init__.py /code/plane/db/models/__init__.py
COPY apps/api/plane/db/migrations/0128_issue_pipeline_item.py /code/plane/db/migrations/0128_issue_pipeline_item.py
COPY apps/api/plane/db/migrations/0129_state_is_pipeline_enabled.py /code/plane/db/migrations/0129_state_is_pipeline_enabled.py
COPY apps/api/plane/db/migrations/0130_pipeline_item_native_fields.py /code/plane/db/migrations/0130_pipeline_item_native_fields.py
COPY apps/api/plane/db/migrations/0131_issue_comment_pipeline_item.py /code/plane/db/migrations/0131_issue_comment_pipeline_item.py

COPY apps/api/plane/app/serializers/issue.py /code/plane/app/serializers/issue.py
COPY apps/api/plane/app/serializers/state.py /code/plane/app/serializers/state.py
COPY apps/api/plane/app/serializers/__init__.py /code/plane/app/serializers/__init__.py
COPY apps/api/plane/api/serializers/issue.py /code/plane/api/serializers/issue.py

COPY apps/api/plane/bgtasks/issue_activities_task.py /code/plane/bgtasks/issue_activities_task.py
COPY apps/api/plane/bgtasks/notification_task.py /code/plane/bgtasks/notification_task.py
COPY apps/api/plane/bgtasks/webhook_task.py /code/plane/bgtasks/webhook_task.py

COPY apps/api/plane/app/views/__init__.py /code/plane/app/views/__init__.py
COPY apps/api/plane/app/views/issue/activity.py /code/plane/app/views/issue/activity.py
COPY apps/api/plane/app/views/issue/base.py /code/plane/app/views/issue/base.py
COPY apps/api/plane/app/views/issue/comment.py /code/plane/app/views/issue/comment.py
COPY apps/api/plane/app/views/issue/pipeline.py /code/plane/app/views/issue/pipeline.py
COPY apps/api/plane/app/views/issue/sub_issue.py /code/plane/app/views/issue/sub_issue.py
COPY apps/api/plane/app/views/search/base.py /code/plane/app/views/search/base.py
COPY apps/api/plane/app/views/search/issue.py /code/plane/app/views/search/issue.py
COPY apps/api/plane/app/views/view/base.py /code/plane/app/views/view/base.py
COPY apps/api/plane/app/views/workspace/user.py /code/plane/app/views/workspace/user.py

COPY apps/api/plane/app/urls/issue.py /code/plane/app/urls/issue.py

FROM plane-backend-ru:v1.3.1-pipeline-mvp13-aliases

COPY apps/api/plane/db/models/project.py /code/plane/db/models/project.py
COPY apps/api/plane/api/serializers/project.py /code/plane/api/serializers/project.py
COPY apps/api/plane/api/serializers/issue.py /code/plane/api/serializers/issue.py
COPY apps/api/plane/api/views/issue.py /code/plane/api/views/issue.py
COPY apps/api/plane/db/migrations/0133_project_default_target_time.py /code/plane/db/migrations/0133_project_default_target_time.py

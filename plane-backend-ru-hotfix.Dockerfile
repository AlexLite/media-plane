FROM artifacts.plane.so/makeplane/plane-backend:v1.3.1

COPY apps/api/plane/bgtasks /code/plane/bgtasks
COPY apps/api/plane/db/models/issue.py /code/plane/db/models/issue.py
COPY apps/api/plane/db/models/module.py /code/plane/db/models/module.py
COPY apps/api/plane/app/serializers/issue.py /code/plane/app/serializers/issue.py
COPY apps/api/plane/app/views/timezone/base.py /code/plane/app/views/timezone/base.py
COPY apps/api/plane/db/migrations/0122_issue_target_time.py /code/plane/db/migrations/0122_issue_target_time.py
COPY apps/api/plane/db/migrations/0123_module_start_time_target_time.py /code/plane/db/migrations/0123_module_start_time_target_time.py
COPY apps/api/templates/emails /code/templates/emails

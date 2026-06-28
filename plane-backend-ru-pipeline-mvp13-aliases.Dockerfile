FROM plane-backend-ru:v1.3.1-pipeline-mvp12-workload

COPY apps/api/plane/db/models/state.py /code/plane/db/models/state.py
COPY apps/api/plane/app/serializers/state.py /code/plane/app/serializers/state.py
COPY apps/api/plane/db/migrations/0132_state_pipeline_aliases.py /code/plane/db/migrations/0132_state_pipeline_aliases.py

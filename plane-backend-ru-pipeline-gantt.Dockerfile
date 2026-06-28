FROM plane-backend-ru:v1.3.1-pipeline-mvp7-asset-post-limit1

COPY apps/api/plane/app/serializers/issue.py /code/plane/app/serializers/issue.py
COPY apps/api/plane/app/views/issue/base.py /code/plane/app/views/issue/base.py
COPY apps/api/plane/utils/grouper.py /code/plane/utils/grouper.py

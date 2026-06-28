FROM plane-backend-ru:v1.3.1-pipeline-mvp11-asset-post-limit1

COPY apps/api/plane/app/views/analytic/advance.py /code/plane/app/views/analytic/advance.py
COPY apps/api/plane/app/views/__init__.py /code/plane/app/views/__init__.py
COPY apps/api/plane/app/urls/analytic.py /code/plane/app/urls/analytic.py

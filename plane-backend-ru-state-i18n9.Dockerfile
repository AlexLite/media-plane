FROM plane-backend-ru:v1.3.1-invite-fix7
COPY apps/api/plane/db/models/state.py /code/plane/db/models/state.py
COPY apps/api/plane/seeds/data/states.json /code/plane/seeds/data/states.json
COPY apps/api/plane/settings/storage.py /code/plane/settings/storage.py

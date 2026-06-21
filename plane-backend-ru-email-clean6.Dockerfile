FROM plane-backend-ru:v1.3.1-vk-email-target-time5

COPY apps/api/templates/emails /code/templates/emails
COPY apps/api/plane/db/management/commands/test_email.py /code/plane/db/management/commands/test_email.py
COPY apps/api/plane/license/api/views/configuration.py /code/plane/license/api/views/configuration.py

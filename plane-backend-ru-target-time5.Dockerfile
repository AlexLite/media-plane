FROM plane-backend-ru:v1.3.1-vk-email-target-time4

COPY apps/api/plane/bgtasks/issue_activities_task.py /code/plane/bgtasks/issue_activities_task.py
COPY apps/api/plane/bgtasks/email_notification_task.py /code/plane/bgtasks/email_notification_task.py
COPY apps/api/templates/emails/notifications/issue-updates.html /code/templates/emails/notifications/issue-updates.html

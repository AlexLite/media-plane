# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

# Python imports
import csv
import io
import logging

# Third party imports
from celery import shared_task

# Django imports
from django.core.mail import EmailMultiAlternatives, get_connection
from django.template.loader import render_to_string
from django.db.models import Q, Case, Value, When
from django.db import models
from django.db.models.functions import Concat

# Module imports
from plane.db.models import Issue
from plane.license.utils.instance_value import get_email_configuration
from plane.utils.analytics_plot import build_graph_plot
from plane.utils.email import generate_plain_text_from_html
from plane.utils.exception_logger import log_exception
from plane.utils.issue_filters import issue_filters
from plane.utils.csv_utils import sanitize_csv_row

row_mapping = {
    "state__name": "Статус",
    "state__group": "Группа статуса",
    "labels__id": "Метка",
    "assignees__id": "Исполнитель",
    "start_date": "Дата начала",
    "target_date": "Срок выполнения",
    "completed_at": "Дата завершения",
    "created_at": "Дата создания",
    "issue_count": "Количество задач",
    "priority": "Приоритет",
    "estimate": "Оценка",
    "issue_cycle__cycle_id": "Цикл",
    "issue_module__module_id": "Модуль",
}

ASSIGNEE_ID = "assignees__id"
LABEL_ID = "labels__id"
STATE_ID = "state_id"
CYCLE_ID = "issue_cycle__cycle_id"
MODULE_ID = "issue_module__module_id"


def build_detail_name_lookups(assignee_details, label_details, state_details, cycle_details, module_details):
    """Build constant-time lookups for CSV axis and segment labels."""
    return {
        ASSIGNEE_ID: {
            str(item[ASSIGNEE_ID]): f"{item['assignees__first_name']} {item['assignees__last_name']}"
            for item in assignee_details
        },
        LABEL_ID: {str(item[LABEL_ID]): item["labels__name"] for item in label_details},
        STATE_ID: {str(item[STATE_ID]): item["state__name"] for item in state_details},
        CYCLE_ID: {str(item[CYCLE_ID]): item["issue_cycle__cycle__name"] for item in cycle_details},
        MODULE_ID: {str(item[MODULE_ID]): item["issue_module__module__name"] for item in module_details},
    }


def send_export_email(email, slug, csv_buffer, rows):
    """Helper function to send export email."""
    subject = "Экспорт готов"
    html_content = render_to_string("emails/exports/analytics.html", {})
    text_content = generate_plain_text_from_html(html_content)

    csv_buffer.seek(0)

    (
        EMAIL_HOST,
        EMAIL_HOST_USER,
        EMAIL_HOST_PASSWORD,
        EMAIL_PORT,
        EMAIL_USE_TLS,
        EMAIL_USE_SSL,
        EMAIL_FROM,
    ) = get_email_configuration()

    connection = get_connection(
        host=EMAIL_HOST,
        port=int(EMAIL_PORT),
        username=EMAIL_HOST_USER,
        password=EMAIL_HOST_PASSWORD,
        use_tls=EMAIL_USE_TLS == "1",
        use_ssl=EMAIL_USE_SSL == "1",
    )

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_content,
        from_email=EMAIL_FROM,
        to=[email],
        connection=connection,
    )
    msg.attach(f"{slug}-analytics.csv", csv_buffer.getvalue())
    msg.send(fail_silently=False)
    return


def get_assignee_details(slug, filters):
    """Fetch assignee details if required."""
    return (
        Issue.issue_objects.filter(
            Q(Q(assignees__avatar__isnull=False) | Q(assignees__avatar_asset__isnull=False)),
            workspace__slug=slug,
            **filters,
        )
        .annotate(
            assignees__avatar_url=Case(
                # If `avatar_asset` exists, use it to generate the asset URL
                When(
                    assignees__avatar_asset__isnull=False,
                    then=Concat(
                        Value("/api/assets/v2/static/"),
                        "assignees__avatar_asset",  # Assuming avatar_asset has an id or relevant field
                        Value("/"),
                    ),
                ),
                # If `avatar_asset` is None, fall back to using `avatar` field directly
                When(assignees__avatar_asset__isnull=True, then="assignees__avatar"),
                default=Value(None),
                output_field=models.CharField(),
            )
        )
        .distinct("assignees__id")
        .order_by("assignees__id")
        .values(
            "assignees__avatar_url",
            "assignees__display_name",
            "assignees__first_name",
            "assignees__last_name",
            "assignees__id",
        )
    )


def get_label_details(slug, filters):
    """Fetch label details if required"""
    return (
        Issue.objects.filter(
            workspace__slug=slug,
            **filters,
            labels__id__isnull=False,
            label_issue__deleted_at__isnull=True,
        )
        .distinct("labels__id")
        .order_by("labels__id")
        .values("labels__id", "labels__color", "labels__name")
    )


def get_state_details(slug, filters):
    return (
        Issue.issue_objects.filter(workspace__slug=slug, **filters)
        .distinct("state_id")
        .order_by("state_id")
        .values("state_id", "state__name", "state__color")
    )


def get_module_details(slug, filters):
    return (
        Issue.issue_objects.filter(
            workspace__slug=slug,
            **filters,
            issue_module__module_id__isnull=False,
            issue_module__deleted_at__isnull=True,
        )
        .distinct("issue_module__module_id")
        .order_by("issue_module__module_id")
        .values("issue_module__module_id", "issue_module__module__name")
    )


def get_cycle_details(slug, filters):
    return (
        Issue.issue_objects.filter(
            workspace__slug=slug,
            **filters,
            issue_cycle__cycle_id__isnull=False,
            issue_cycle__deleted_at__isnull=True,
        )
        .distinct("issue_cycle__cycle_id")
        .order_by("issue_cycle__cycle_id")
        .values("issue_cycle__cycle_id", "issue_cycle__cycle__name")
    )


def generate_csv_from_rows(rows):
    """Generate CSV buffer from rows."""
    csv_buffer = io.StringIO()
    writer = csv.writer(csv_buffer, delimiter=",", quoting=csv.QUOTE_ALL)
    [writer.writerow(sanitize_csv_row(row)) for row in rows]
    return csv_buffer


def generate_segmented_rows(
    distribution,
    x_axis,
    y_axis,
    segment,
    key,
    assignee_details,
    label_details,
    state_details,
    cycle_details,
    module_details,
):
    segment_zero = list(set(item.get("segment") for sublist in distribution.values() for item in sublist))
    detail_name_lookups = build_detail_name_lookups(
        assignee_details, label_details, state_details, cycle_details, module_details
    )

    row_zero = [
        row_mapping.get(x_axis, "Ось X"),
        row_mapping.get(y_axis, "Ось Y"),
    ] + segment_zero

    rows = []
    for item, data in distribution.items():
        values_by_segment = {}
        for entry in data:
            values_by_segment.setdefault(entry.get("segment"), entry.get(key, "0"))
        generated_row = [
            item,
            sum(obj.get(key) for obj in data if obj.get(key) is not None),
        ]

        generated_row.extend(values_by_segment.get(segment, "0") for segment in segment_zero)

        item_name = detail_name_lookups.get(x_axis, {}).get(str(item))
        if item_name:
            generated_row[0] = item_name

        rows.append(tuple(generated_row))

    segment_name_lookup = detail_name_lookups.get(segment)
    if segment_name_lookup:
        for index, segm in enumerate(row_zero[2:]):
            segment_name = segment_name_lookup.get(str(segm))
            if segment_name:
                row_zero[index + 2] = segment_name

    return [tuple(row_zero)] + rows


def generate_non_segmented_rows(
    distribution,
    x_axis,
    y_axis,
    key,
    assignee_details,
    label_details,
    state_details,
    cycle_details,
    module_details,
):
    detail_name_lookups = build_detail_name_lookups(
        assignee_details, label_details, state_details, cycle_details, module_details
    )
    rows = []
    for item, data in distribution.items():
        row = [item, data[0].get("count" if y_axis == "issue_count" else "estimate")]
        item_name = detail_name_lookups.get(x_axis, {}).get(str(item))
        if item_name:
            row[0] = item_name

        rows.append(tuple(row))

    row_zero = [row_mapping.get(x_axis, "Ось X"), row_mapping.get(y_axis, "Ось Y")]
    return [tuple(row_zero)] + rows


@shared_task
def analytic_export_task(email, data, slug):
    try:
        filters = issue_filters(data, "POST")
        queryset = Issue.issue_objects.filter(**filters, workspace__slug=slug)

        x_axis = data.get("x_axis", False)
        y_axis = data.get("y_axis", False)
        segment = data.get("segment", False)

        distribution = build_graph_plot(queryset, x_axis=x_axis, y_axis=y_axis, segment=segment)
        key = "count" if y_axis == "issue_count" else "estimate"

        assignee_details = (
            get_assignee_details(slug, filters) if x_axis == ASSIGNEE_ID or segment == ASSIGNEE_ID else {}
        )

        label_details = get_label_details(slug, filters) if x_axis == LABEL_ID or segment == LABEL_ID else {}

        state_details = get_state_details(slug, filters) if x_axis == STATE_ID or segment == STATE_ID else {}

        cycle_details = get_cycle_details(slug, filters) if x_axis == CYCLE_ID or segment == CYCLE_ID else {}

        module_details = get_module_details(slug, filters) if x_axis == MODULE_ID or segment == MODULE_ID else {}

        if segment:
            rows = generate_segmented_rows(
                distribution,
                x_axis,
                y_axis,
                segment,
                key,
                assignee_details,
                label_details,
                state_details,
                cycle_details,
                module_details,
            )
        else:
            rows = generate_non_segmented_rows(
                distribution,
                x_axis,
                y_axis,
                key,
                assignee_details,
                label_details,
                state_details,
                cycle_details,
                module_details,
            )

        csv_buffer = generate_csv_from_rows(rows)
        send_export_email(email, slug, csv_buffer, rows)
        logging.getLogger("plane.worker").info("Email sent successfully.")
        return
    except Exception as e:
        log_exception(e)
        return


@shared_task
def export_analytics_to_csv_email(data, headers, keys, email, slug):
    try:
        """
        Prepares a CSV from data and sends it as an email attachment.

        Parameters:
        - data: List of dictionaries (e.g. from .values())
        - headers: List of CSV column headers
        - keys: Keys to extract from each data item (dict)
        - email: Email address to send to
        - slug: Used for the filename
        """
        # Prepare rows: header + data rows
        rows = [headers]
        for item in data:
            row = [item.get(key, "") for key in keys]
            rows.append(row)

        # Generate CSV buffer
        csv_buffer = generate_csv_from_rows(rows)

        # Send email with CSV attachment
        send_export_email(email=email, slug=slug, csv_buffer=csv_buffer, rows=rows)
    except Exception as e:
        log_exception(e)
        return

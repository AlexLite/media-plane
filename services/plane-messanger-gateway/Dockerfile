FROM artifacts.plane.so/makeplane/plane-backend:v1.3.1

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_PORT=8083

WORKDIR /app

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app

EXPOSE 8083

ENTRYPOINT []
CMD ["sh", "-c", "exec uvicorn app.secure_entrypoint:app --host 0.0.0.0 --port ${APP_PORT:-8083}"]

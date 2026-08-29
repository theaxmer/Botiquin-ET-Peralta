FROM python:3.11-alpine
WORKDIR /app
RUN apk update && apk add gcc musl-dev postgresql-dev
COPY requirements.txt .
RUN pip install -r requirements.txt
RUN apt-get update && apt-get install -y graphviz graphviz-dev
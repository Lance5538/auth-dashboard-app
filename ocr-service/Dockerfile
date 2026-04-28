FROM python:3.11-slim

WORKDIR /app

RUN sed -i 's|http://deb.debian.org/debian|https://mirrors.cloud.tencent.com/debian|g; s|http://deb.debian.org/debian-security|https://mirrors.cloud.tencent.com/debian-security|g' /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -i https://mirrors.cloud.tencent.com/pypi/simple --trusted-host mirrors.cloud.tencent.com -r requirements.txt

COPY app.py ./app.py

EXPOSE 8001

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]

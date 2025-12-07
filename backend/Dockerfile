FROM python:3.12-slim

WORKDIR /app

# システム依存パッケージのインストール
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY pyproject.toml .

# Python依存関係のインストール（dev依存含む）
RUN pip install --no-cache-dir -e ".[dev]"

# アプリケーションコードをコピー
COPY . .

# ポート8000を公開
EXPOSE 8000

# Uvicornでアプリケーションを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

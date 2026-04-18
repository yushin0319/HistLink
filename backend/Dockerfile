FROM python:3.12-slim

WORKDIR /app

# システム依存パッケージのインストール
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 依存関係ファイルをコピー
COPY pyproject.toml .

# Python依存関係のインストール
RUN pip install --no-cache-dir .

# アプリケーションコードをコピー
COPY . .

# 非rootユーザーで実行（コンテナエスケープ時の影響最小化）
# インタラクティブログイン不要のため /sbin/nologin でログイン禁止
RUN useradd --create-home --shell /sbin/nologin appuser && chown -R appuser:appuser /app
USER appuser

# ポート8000を公開
EXPOSE 8000

# Uvicornでアプリケーションを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

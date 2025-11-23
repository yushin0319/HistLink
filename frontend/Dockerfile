FROM node:20-slim

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係のインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# ポート5173を公開（Viteのデフォルト）
EXPOSE 5173

# Vite dev serverを起動（ホストを0.0.0.0に設定）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    // msw 3 は XHR/fetch を Node の http 層で横取りするため、happy-dom の fetch が
    // 先に CORS プリフライト (OPTIONS) を送ってしまい本リクエストまで届かない。
    // テスト環境では同一オリジンポリシーを無効化して msw 2 と同じ挙動に揃える。
    environmentOptions: {
      happyDOM: {
        settings: { fetch: { disableSameOriginPolicy: true } },
      },
    },
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        'src/test/**',
        'src/main.tsx', // エントリーポイント
        'src/App.tsx', // ルートコンポーネント
        'src/types/**', // 型定義ファイル
      ],
      all: true,
    },
  },
});

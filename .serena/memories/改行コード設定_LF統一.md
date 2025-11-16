# 改行コード設定 - LF統一

## プロジェクト方針

**すべてのファイルでLF（`\n`）改行コードを使用**

Windows環境でも、リポジトリとローカルの両方でLFを統一する。

---

## 設定ファイル

### 1. Git設定（`.git/config`）

```bash
# プロジェクトローカル設定
git config core.autocrlf input
```

**動作:**
- コミット時：CRLF → LF変換
- チェックアウト時：変換なし（LFのまま）

**確認コマンド:**
```bash
git config --get core.autocrlf
# 出力: input
```

---

### 2. .gitattributes

主要なファイルタイプでLFを強制：

```gitattributes
# TSV files should always use LF
*.tsv text eol=lf

# Markdown files should use LF
*.md text eol=lf

# SQL files should use LF
*.sql text eol=lf

# Python files should use LF
*.py text eol=lf

# TypeScript/JavaScript files should use LF
*.ts text eol=lf
*.tsx text eol=lf
*.js text eol=lf
*.jsx text eol=lf
*.json text eol=lf
```

---

### 3. .editorconfig

エディタ（VS Code等）でLFを強制：

```editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.py]
indent_style = space
indent_size = 4

[*.{ts,tsx,js,jsx,json}]
indent_style = space
indent_size = 2

[*.tsv]
indent_style = tab
```

---

## トラブルシューティング

### 既存ファイルの改行コード確認

```bash
file -b <filename> | grep -o 'CRLF\|LF'
```

### 一括変更（必要な場合のみ）

```bash
# すべてのPythonファイルをLFに変換
find . -name "*.py" -exec dos2unix {} \;
```

---

## 設定日

**2025-11-16**: HistLinkプロジェクトでLF統一設定完了

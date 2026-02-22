#!/bin/bash
# Git hooks のセットアップ
# 使い方: bash scripts/setup-hooks.sh

git config core.hooksPath .githooks
chmod +x .githooks/pre-push
echo "Git hooks configured. Pre-push hook is now active."

#!/usr/bin/env bash
# 下载依赖库到 libs/
set -e
mkdir -p "$(dirname "$0")/libs"
curl -sL "https://cdn.jsdelivr.net/npm/@mozilla/readability/Readability.js" -o "$(dirname "$0")/libs/readability.js"
curl -sL "https://cdn.jsdelivr.net/npm/turndown/dist/turndown.js"           -o "$(dirname "$0")/libs/turndown.js"
echo "✅ libs 下载完成"

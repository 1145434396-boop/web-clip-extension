# web-clip-extension

把当前网页剪藏成 Markdown 的 Chrome 插件。点击图标 → 点按钮 → 自动下载 `.md` 文件。

## 安装

```bash
# 1. 克隆仓库
git clone https://github.com/1145434396-boop/web-clip-extension.git
cd web-clip-extension

# 2. 下载依赖库
bash setup.sh

# 3. 在 Chrome 中加载
#    地址栏输入 chrome://extensions
#    开启右上角「开发者模式」
#    点「加载已解压的扩展程序」→ 选这个目录
```

## 使用

打开任意网页 → 点工具栏的 📎 图标 → 点「剪藏当前页面」→ 下载到本地。

## 输出格式

```markdown
---
title: 文章标题
source_url: https://...
captured_at: 2026-06-02
---

# 文章标题

正文内容…
```

## 与 CLI 脚本（web-clip）对比

| | Chrome 插件 | [web-clip](https://github.com/1145434396-boop/web-clip) CLI |
|---|---|---|
| 触发方式 | 手动点击 | Claude 调用 |
| 图片 | 保留远程链接 | 下载到本地 |
| 已登录页面（知乎等） | ✅ 直接抓 | 需特殊处理 |
| 落地目录 | 下载文件夹 | 任意指定目录 |

## License

MIT

# web-clip-extension

把**当前正在看的网页**一键剪藏成 Markdown + 本地图片的 Chrome 插件。点工具栏 📎 图标 → 点「剪藏当前页面」→ 自动下载到本地。

因为是在你已打开的标签页上抓取，**需要登录才能看的页面（知乎、飞书、公司内部系统等）也能直接剪**，无需额外配置认证。

## 能剪藏什么

| 网站 | 抓取的内容 | 说明 |
|------|-----------|------|
| **微信公众号** `mp.weixin.qq.com` | 标题、正文（段落 / 各级标题 / 引用 / 列表）、正文图片 | 专门解析 `js_content`，图文按原顺序 |
| **飞书 Wiki / 文档** `*.feishu.cn` `*.larksuite.com` | 标题、正文、标题层级、引用、列表、**表格**、图片、链接 | 自动滚动加载后按 block 提取；画板/电子表格留占位 |
| **小红书** `xiaohongshu.com` | 笔记文案 + 图集 | 免登录拿文案与配图（图库形式） |
| **知乎 / 博客 / 新闻 / 其它任意网页** | 标题 + 正文 + 正文图片 | Readability 抽正文，Turndown 转 Markdown |

**通用行为：**

- 正文转成干净的 Markdown，图片**下载到本地** `assets/`，正文里的图片链接改写成相对路径
- 每篇生成一个独立文件夹：`<标题>.md` + 同篇图片放一起，直接拖进知识库即可
- 抓不到正文时给出明确提示（如需登录或页面未加载完）

## 落地结构

下载到浏览器默认下载目录下：

```
下载目录/web-clips/<标题>/
├── <标题>.md
└── assets/
    └── <标题>-00.png, <标题>-01.jpg, ...
```

## 输出格式

```markdown
---
title: 文章标题
source_url: https://...
captured_at: 2026-06-02
---

# 文章标题

正文内容…

![](assets/文章标题-00.png)
```

## 安装

```bash
# 1. 克隆仓库
git clone https://github.com/1145434396-boop/web-clip-extension.git
cd web-clip-extension

# 2. 下载依赖库（Readability + Turndown）
bash setup.sh

# 3. 在 Chrome 中加载
#    地址栏输入 chrome://extensions
#    开启右上角「开发者模式」
#    点「加载已解压的扩展程序」→ 选这个目录
```

## 使用

打开任意网页 → 点工具栏的 📎 图标 → 点「剪藏当前页面」→ 文件下载到本地。

## License

MIT

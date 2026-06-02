const btn = document.getElementById('clip');
const status = document.getElementById('status');

function setStatus(msg, type = '') {
  status.textContent = msg;
  status.className = type;
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('抓取中…');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 注入两个库（顺序执行，await 保证先后）
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['libs/readability.js'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['libs/turndown.js'] });

    // 在页面上下文里提取正文，返回结构化数据
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const article = new Readability(document.cloneNode(true)).parse();
        if (!article) return null;
        const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
        return {
          title:   article.title || document.title || '无标题',
          content: td.turndown(article.content),
          url:     location.href,
          date:    new Date().toISOString().split('T')[0],
        };
      },
    });

    if (!result) {
      setStatus('❌ 无法提取正文（可能是登录墙或纯图片页）', 'err');
      return;
    }

    // 拼 Markdown
    const md = [
      '---',
      `title: ${result.title}`,
      `source_url: ${result.url}`,
      `captured_at: ${result.date}`,
      '---',
      '',
      `# ${result.title}`,
      '',
      result.content,
    ].join('\n');

    // 下载
    const slug = result.title.replace(/[\\/:*?"<>|#\n]/g, '-').trim().slice(0, 60);
    const url  = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    await chrome.downloads.download({ url, filename: slug + '.md', saveAs: false });

    setStatus(`✅ ${slug}.md`, 'ok');
  } catch (e) {
    setStatus('❌ ' + e.message, 'err');
  } finally {
    btn.disabled = false;
  }
});

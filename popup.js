const btnClip  = document.getElementById('btnClip');
const statusEl = document.getElementById('status');

function setStatus(msg, type = '') { statusEl.textContent = msg; statusEl.className = type; }

const INVISIBLE = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;

function slugify(title) {
  return (title || 'untitled')
    .replace(INVISIBLE, '')
    .replace(/[^\u4e00-\u9fff\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim()
    .slice(0, 60) || 'untitled';
}

function extFromMime(mime) {
  return { 'image/jpeg':'jpg','image/png':'png','image/gif':'gif',
           'image/webp':'webp','image/svg+xml':'svg' }[mime] ?? 'png';
}

// 非飞书平台：在隔离 world 运行（可用 Readability/Turndown）
async function extractOther() {
  const INVISIBLE = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g;
  const host = location.hostname;
  async function fetchImg(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const blob = await resp.blob();
      const b64 = await new Promise(r => { const fr = new FileReader(); fr.onloadend = () => r(fr.result); fr.readAsDataURL(blob); });
      return { dataUrl: b64, mime: blob.type };
    } catch { return null; }
  }
  let title = '', content = '';
  const images = {};

  if (host.includes('mp.weixin.qq.com')) {
    const titleEl = document.querySelector('.rich_media_title');
    title = titleEl ? titleEl.textContent.trim() : document.title;
    const jsCont = document.getElementById('js_content');
    if (!jsCont) throw new Error('js_content not found');
    const BLOCK = new Set(['p','section','h1','h2','h3','h4','blockquote','li']);
    const lines = [];
    function walk(node) {
      if (node.nodeType !== 1) return;
      const tag = node.tagName.toLowerCase();
      if (tag === 'img') {
        const src = (node.getAttribute('data-src') || node.src || '').trim();
        if (src && src.startsWith('http')) { lines.push(`![](${src})`); lines.push(''); images[src] = null; }
        return;
      }
      if (BLOCK.has(tag)) {
        const hasChild = [...node.children].some(c => { const ct = c.tagName.toLowerCase(); return BLOCK.has(ct)||ct==='img'||ct==='ul'||ct==='ol'; });
        if (!hasChild) {
          const txt = node.textContent.trim();
          if (txt) {
            if (/^h[1-4]$/.test(tag)) lines.push('#'.repeat(Math.max(parseInt(tag[1]),2))+' '+txt);
            else if (tag==='blockquote') lines.push('> '+txt);
            else if (tag==='li') lines.push('- '+txt);
            else lines.push(txt);
            lines.push('');
          }
          // 补捞包在 span 等非块级元素里的图片（否则会被当叶子丢掉）
          for (const im of node.querySelectorAll('img')) {
            const isrc = (im.getAttribute('data-src') || im.src || '').trim();
            if (isrc && isrc.startsWith('http')) { lines.push(`![](${isrc})`); lines.push(''); images[isrc] = null; }
          }
          return;
        }
      }
      for (const c of node.children) walk(c);
    }
    for (const c of jsCont.children) walk(c);
    content = lines.join('\n');
    for (const url of Object.keys(images)) images[url] = await fetchImg(url);
    for (const url of Object.keys(images)) { if (!images[url]) delete images[url]; }

  } else if (/xiaohongshu\.com|xhslink\.com/.test(host)) {
    const article = new Readability(document.cloneNode(true)).parse();
    title = (article?.title || document.title).replace(/ - \u5c0f\u7ea2\u4e66/g, '').trim();
    let body = article ? new TurndownService({ headingStyle:'atx' }).turndown(article.content) : '';
    body = body.replace(/\[(#[^\]]+)\]\([^)]*\)/g, '$1')
               .replace(/^\s*\u52a0\u8f7d\u4e2d\s*$/gm, '')
               .replace(/\n{3,}/g, '\n\n').trim();
    let xhsImgUrls = [];
    try {
      const noteMap = window.__INITIAL_STATE__?.note?.noteDetailMap || {};
      for (const key of Object.keys(noteMap))
        for (const img of (noteMap[key]?.note?.imageList || []))
          if (img.urlDefault) xhsImgUrls.push(img.urlDefault);
    } catch {}
    if (!xhsImgUrls.length) {
      const seen = new Set();
      for (const m of document.documentElement.innerHTML.matchAll(/"urlDefault":"([^"]+)"/g)) {
        const url = m[1].replace(/\\u002F/g, '/');
        const fid = url.match(/\/([0-9a-z]+)!/)?.[1] || url;
        if (!seen.has(fid)) { seen.add(fid); xhsImgUrls.push(url); }
      }
    }
    const gallery = [];
    for (const url of xhsImgUrls) {
      const realUrl = url.startsWith('http') ? url : 'https:' + url;
      const data = await fetchImg(realUrl);
      if (data) { images[realUrl] = data; gallery.push(`![](${realUrl})`); }
    }
    content = body + (gallery.length ? '\n\n' + gallery.join('\n\n') : '');

  } else {
    // 1) 滚动到底触发懒加载图片，再回到顶部
    const _sh = document.body.scrollHeight;
    for (let p = 0; p <= _sh; p += 600) { window.scrollTo(0, p); await new Promise(r => setTimeout(r, 200)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));

    // 2) 代理 URL（如 Next.js 的 /_next/image?url=ENCODED）解码成真实原图
    const resolveUrl = (u) => {
      if (!u) return '';
      const m = u.match(/\/_next\/image\?url=([^&]+)/);
      if (m) { try { return decodeURIComponent(m[1]); } catch {} }
      return u;
    };
    // 3) 把懒加载 / srcset / 代理的真实地址写回 img.src，让 Readability 能保留、md 链接正确
    for (const img of document.querySelectorAll('img')) {
      let u = img.currentSrc || img.getAttribute('src') || img.getAttribute('data-src') || '';
      if ((!u || u.startsWith('data:')) && img.getAttribute('srcset')) {
        const cands = img.getAttribute('srcset').split(',').map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
        if (cands.length) u = cands[cands.length - 1];  // srcset 取最后（通常最大）
      }
      u = resolveUrl(u);
      if (u && u.startsWith('http')) img.setAttribute('src', u);
    }

    // 4) 记录「文章首图」候选（DOM 中第一张大图，排除导航/页脚）——Readability 常把正文主体外的首图裁掉
    let leadUrl = '';
    for (const img of document.querySelectorAll('img')) {
      if (img.closest('nav, footer')) continue;
      const w = img.naturalWidth || parseInt(img.getAttribute('width')) || 0;
      const h = img.naturalHeight || parseInt(img.getAttribute('height')) || 0;
      if (w >= 400 || h >= 400) {
        const u = resolveUrl(img.currentSrc || img.getAttribute('src') || '');
        if (u && u.startsWith('http')) { leadUrl = u; break; }
      }
    }

    const article = new Readability(document.cloneNode(true)).parse();
    if (!article) return null;
    const td = new TurndownService({ headingStyle:'atx', codeBlockStyle:'fenced' });
    const imgUrls = [...new Set([...article.content.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => resolveUrl(m[1])))].filter(u => u.startsWith('http'));
    for (const url of imgUrls) { const data = await fetchImg(url); if (data) images[url] = data; }
    content = td.turndown(article.content);
    title = (article.title || document.title || '').replace(INVISIBLE, '').trim();

    // 首图若未被正文收录，补到正文开头
    if (leadUrl && !imgUrls.includes(leadUrl)) {
      const data = await fetchImg(leadUrl);
      if (data) { images[leadUrl] = data; content = `![](${leadUrl})\n\n` + content; }
    }
  }
  return { title: title || '\u65e0\u6807\u9898', content, images };
}

// 飞书：在 MAIN world 滚动加载后调用注入的提取器
async function extractFeishuMain() {
  const sc = document.querySelector('.bear-web-x-container') || document.documentElement;
  let h = sc.scrollHeight;
  for (let pos = 0; pos <= h + 800; pos += 600) {
    sc.scrollTop = pos;
    await new Promise(r => setTimeout(r, 250));
    h = sc.scrollHeight;
  }
  await new Promise(r => setTimeout(r, 1500));
  if (typeof window.__webclipExtractFeishu !== 'function') return null;
  return await window.__webclipExtractFeishu();
}

btnClip.addEventListener('click', async () => {
  btnClip.disabled = true;
  setStatus('\u63d0\u53d6\u6b63\u6587...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const host = new URL(tab.url).hostname;
    let result;

    if (/feishu\.cn|larksuite\.com/.test(host)) {
      // 飞书：注入提取器到 MAIN world，再调用
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['feishu-extract.js'] });
      const [{ result: r }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, world: 'MAIN', func: extractFeishuMain,
      });
      result = r;
    } else {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['libs/readability.js'] });
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['libs/turndown.js'] });
      const [{ result: r }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractOther });
      result = r;
    }

    if (!result) { setStatus('\u274c \u65e0\u6cd5\u63d0\u53d6\u6b63\u6587\uff08\u9700\u767b\u5f55\u6001\u6216\u9875\u9762\u672a\u52a0\u8f7d\uff09', 'err'); return; }

    setStatus('\u4e0b\u8f7d\u6587\u4ef6...');
    const slug = slugify(result.title);
    let md = result.content;
    let imgCount = 0;

    for (const [url, val] of Object.entries(result.images)) {
      if (!val) continue;
      const filename = `${slug}-${String(imgCount).padStart(2,'0')}.${extFromMime(val.mime)}`;
      const bytes = Uint8Array.from(atob(val.dataUrl.split(',')[1]), c => c.charCodeAt(0));
      const blobUrl = URL.createObjectURL(new Blob([bytes], { type: val.mime }));
      await chrome.downloads.download({ url: blobUrl, filename: `web-clips/${slug}/assets/${filename}`, saveAs: false, conflictAction: 'overwrite' });
      md = md.replaceAll(url, `assets/${filename}`);
      imgCount++;
    }

    const fm = ['---', `title: ${result.title}`, `source_url: ${tab.url}`, `captured_at: ${new Date().toISOString().split('T')[0]}`, '---', '', `# ${result.title}`, ''].join('\n');
    await chrome.downloads.download({
      url: URL.createObjectURL(new Blob([fm + md], { type: 'text/markdown' })),
      filename: `web-clips/${slug}/${slug}.md`,
      saveAs: false, conflictAction: 'overwrite',
    });

    setStatus(`\u2705 ${slug}/\n  \ud83d\udcc4 ${slug}.md\n  \ud83d\uddbc\ufe0f ${imgCount} \u5f20\u56fe\u7247`, 'ok');
  } catch (e) {
    setStatus('\u274c ' + e.message, 'err');
  } finally {
    btnClip.disabled = false;
  }
});

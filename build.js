import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);
const TEMPLATE_DIR = path.join(ROOT, 'templates');
const SITE_DIR = path.join(ROOT, 'site');
const DIST_DIR = path.join(ROOT, 'dist');

const SERVICE_DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;
const API_KEY = process.env.MICROCMS_API_KEY;
const SITE_URL = (process.env.SITE_URL || 'https://www.arareya.com').replace(/\/$/, '');

if (!SERVICE_DOMAIN || !API_KEY) {
  throw new Error('MICROCMS_SERVICE_DOMAIN と MICROCMS_API_KEY を環境変数に設定してください。');
}

const API_URL = `https://${SERVICE_DOMAIN}.microcms.io/api/v1/news`;
const PER_PAGE = 20;
const TOP_COUNT = 5;

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripHtml(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 120) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatDateJP(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatDateDot(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateISO(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function articleSlug(article) {
  const slug = String(article.slug || '').trim();
  if (!slug) throw new Error(`slug が未入力です。記事ID: ${article.id}`);
  if (!/^[A-Za-z0-9_-]+$/.test(slug)) {
    throw new Error(`slug は英数字・ハイフン・アンダースコアのみ使用してください: ${slug}`);
  }
  return slug;
}

async function getNews() {
  const contents = [];
  let offset = 0;

  while (true) {
    const url = `${API_URL}?limit=100&offset=${offset}&orders=-date`;
    const response = await fetch(url, {
      headers: { 'X-MICROCMS-API-KEY': API_KEY }
    });

    if (!response.ok) {
      throw new Error(`microCMS API Error: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    contents.push(...(data.contents || []));

    if (contents.length >= data.totalCount || (data.contents || []).length === 0) break;
    offset += data.contents.length;
  }

  return contents.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function replaceOnce(template, marker, value) {
  if (!template.includes(marker)) throw new Error(`テンプレートに ${marker} がありません。`);
  return template.replace(marker, value);
}

function createTopNews(news) {
  return news.slice(0, TOP_COUNT).map(article => {
    const slug = articleSlug(article);
    const title = escapeHtml(article.title);
    const category = escapeHtml(article.category || 'お知らせ');
    return `
                        <li>
                            <span class="oshirase_date">${escapeHtml(formatDateJP(article.date))}</span>
                            <a href="${slug}.html" class="oshirase_lead">
                                <span class="blog_icon2">${category}</span>
                                ${title}
                            </a>
                        </li>`;
  }).join('\n');
}

function createListItems(news) {
  return news.map(article => {
    const slug = articleSlug(article);
    const title = escapeHtml(article.title);
    const category = escapeHtml(article.category || 'お知らせ');
    return `
        <div class="blog_kiji_wrap cloud">
            <a href="${slug}.html" class="blog_h2">
                <span class="blog_icon2">${category}</span>
                ${title}
            </a>
            <div class="blog_h3">
                ｜更新日 ｜ ${escapeHtml(formatDateISO(article.date))}
            </div>
        </div>`;
  }).join('\n');
}

function createPagination(page, pageCount) {
  if (pageCount <= 1) return '';

  const links = [];
  const pageFile = n => n === 1 ? 'blog_top.html' : `blog_top${n}.html`;

  if (page > 1) {
    links.push(`<a class="prev page-numbers" href="${pageFile(page - 1)}">＜</a>`);
  }

  for (let n = 1; n <= pageCount; n++) {
    if (pageCount > 7 && n !== 1 && n !== pageCount && Math.abs(n - page) > 1) {
      if (links[links.length - 1] !== '<span class="page-numbers dots">…</span>') {
        links.push('<span class="page-numbers dots">…</span>');
      }
      continue;
    }

    if (n === page) {
      links.push(`<span aria-current="page" class="page-numbers current">${n}</span>`);
    } else {
      links.push(`<a class="page-numbers" href="${pageFile(n)}">${n}</a>`);
    }
  }

  if (page < pageCount) {
    links.push(`<a class="next page-numbers" href="${pageFile(page + 1)}">＞</a>`);
  }

  return links.join('\n    ');
}

function createDetailHtml(template, article, index, news) {
  const title = escapeHtml(article.title);
  const category = escapeHtml(article.category || 'お知らせ');
  const description = escapeHtml(article.description || truncate(stripHtml(article.body || ''), 120));
  const slug = articleSlug(article);
  const url = `${SITE_URL}/${slug}.html`;
  const ogImage = article.ogImage?.url || `${SITE_URL}/images/top_1200x630.jpg`;

  const prev = news[index + 1];
  const next = news[index - 1];
  const prevLink = prev
    ? `<a href="${articleSlug(prev)}.html" class="blog_itokuzu-font">＜&nbsp;前の記事へ</a>&nbsp;`
    : '';
  const nextLink = next
    ? `&nbsp;｜&nbsp;<a href="${articleSlug(next)}.html" class="blog_itokuzu-font">次の記事へ&nbsp;＞</a>`
    : '';

  return template
    .replaceAll('%%TITLE%%', title)
    .replaceAll('%%OG_TITLE%%', escapeHtml(`お知らせ ${formatDateDot(article.date)} ${article.title}｜あられの匠白木Webサイト`))
    .replaceAll('%%DESCRIPTION%%', description)
    .replaceAll('%%URL%%', url)
    .replaceAll('%%OG_IMAGE%%', escapeHtml(ogImage))
    .replaceAll('%%CATEGORY%%', category)
    .replaceAll('%%DATE_DOT%%', escapeHtml(formatDateDot(article.date)))
    .replaceAll('%%BODY%%', article.body || '')
    .replaceAll('%%PREV_LINK%%', prevLink)
    .replaceAll('%%NEXT_LINK%%', nextLink);
}

function cleanDist() {
  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.cpSync(src, dest, { recursive: true });
}

async function build() {
  cleanDist();
  copyDir(SITE_DIR, DIST_DIR);

  const news = await getNews();
  console.log(`${news.length}件のお知らせを取得しました。`);

  // トップページ
  let indexHtml = fs.readFileSync(path.join(TEMPLATE_DIR, 'index.template.html'), 'utf8');
  indexHtml = replaceOnce(indexHtml, '<!-- MICROCMS_NEWS_TOP -->', createTopNews(news));
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);

  // お知らせ一覧ページ（20件/ページ）
  const pageCount = Math.max(1, Math.ceil(news.length / PER_PAGE));
  const listTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog_top.template.html'), 'utf8');

  for (let page = 1; page <= pageCount; page++) {
    const pageNews = news.slice((page - 1) * PER_PAGE, page * PER_PAGE);
    let html = listTemplate;
    html = replaceOnce(html, '<!-- MICROCMS_NEWS_LIST -->', createListItems(pageNews));
    html = replaceOnce(html, '<!-- MICROCMS_PAGINATION -->', createPagination(page, pageCount));
    html = html.replace('<title>お知らせ一覧1｜あられの匠白木Webサイト</title>', `<title>お知らせ一覧${page}｜あられの匠白木Webサイト</title>`);
    const filename = page === 1 ? 'blog_top.html' : `blog_top${page}.html`;
    fs.writeFileSync(path.join(DIST_DIR, filename), html);
  }

  // お知らせ詳細ページ
  const detailTemplate = fs.readFileSync(path.join(TEMPLATE_DIR, 'blog_detail.template.html'), 'utf8');
  news.forEach((article, index) => {
    const filename = `${articleSlug(article)}.html`;
    const html = createDetailHtml(detailTemplate, article, index, news);
    fs.writeFileSync(path.join(DIST_DIR, filename), html);
  });

  console.log(`一覧 ${pageCount}ページ、詳細 ${news.length}ページを生成しました。`);
}

build().catch(error => {
  console.error(error);
  process.exit(1);
});

# microCMS + 静的HTML構成（あられの匠 白木向け）

## 1. microCMSのAPI

API名：お知らせ
エンドポイント：news
形式：リスト形式

推奨フィールド：

| ID | 表示名 | 種類 | 内容 |
|---|---|---|---|
| title | タイトル | テキスト | 記事タイトル |
| date | 更新日 | 日時 | 一覧の並び順にも使用 |
| category | カテゴリー | セレクト | 店舗情報 / 商品情報 / キャンペーン情報 / お知らせ |
| slug | URLスラッグ | テキスト | 例：blog2026_08_17_3 |
| description | description | テキストエリア | SEO用説明文。空欄なら本文から自動生成 |
| body | 本文 | リッチエディタ | 記事本文 |
| ogImage | OGP画像 | 画像 | 任意。空欄なら /images/top_1200x630.jpg |

### 既存100記事のURLを維持する

既存記事は slug に拡張子なしの現在ファイル名を登録します。

例：

blog2026_08_17_3.html → slug = blog2026_08_17_3
blog2026_08_17_2.html → slug = blog2026_08_17_2

これにより既存URLをそのまま再生成できます。

新規記事は、例えば slug = blog2026_09_08_1 のように英数字・ハイフン・アンダースコアで登録してください。

## 2. GitHub Secrets

以下を登録します。

MICROCMS_SERVICE_DOMAIN
MICROCMS_API_KEY
SITE_URL
FTP_SERVER
FTP_USERNAME
FTP_PASSWORD
FTP_SERVER_DIR

例：
SITE_URL = https://www.arareya.com

## 3. ローカルテスト

Node.jsをインストール後、このフォルダで実行：

MICROCMS_SERVICE_DOMAIN=xxxxx MICROCMS_API_KEY=xxxxx SITE_URL=https://www.arareya.com npm run build

生成先：dist/

## 4. GitHub Actions

Actions → Build and Deploy Website → Run workflow で手動実行できます。

成功後、microCMSのWebhookで同じworkflowを repository_dispatch で起動します。

## 5. 注意

- APIキーやFTPパスワードをHTML/JavaScriptに書かない。
- microCMS APIキーはGET権限のみの読み取り専用キーを使用する。
- 本番FTPを設定する前に dist/ の生成結果を確認する。
- 既存100記事の移行は、まず1〜3件でテストする。

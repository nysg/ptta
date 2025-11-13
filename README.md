# ptta v2.0 - AI External Memory

**AIのための外部記憶装置 (External Memory for AI)**

pttaは、Claude CodeなどのAIアシスタントがセッション間で**会話・思考・コード変更履歴**を永続化するための、AIファーストな外部記憶システムです。

## 🎯 コンセプト

従来の「タスク管理ツール」から「**AIのための外部記憶装置**」へ。

- **コンテキストウィンドウ節約**: セッション間で完全な履歴を保存・参照
- **完全な履歴保存**: 要約ではなく、実際の会話、思考プロセス、コード編集を保存
- **AIファースト設計**: AIが読み取りやすく、書き込みやすいデータ構造

## ⚡ 特徴

- 🎬 **イベントストリーム型**: すべての活動を時系列のイベントとして記録
- 💭 **思考プロセス記録**: Claudeの思考内容（thinkingブロック）を保存
- 📝 **Intent → Edit フロー**: コード変更の意図を先に記録してから実際の編集を実行
- 🔍 **FTS5全文検索**: 日本語・英語対応の高速検索
- 🌐 **WebUI**: セッションのタイムライン表示、イベント検索
- 💾 **SQLite**: 高速で信頼性の高いローカルストレージ

## 📦 インストール

```bash
npm install -g @nysg/ptta
```

### ローカル開発

```bash
npm install
npm run build
npm link
```

## 🚀 基本的な使い方

### 1. セッション管理

```bash
# セッション開始
ptta session:start

# 現在のセッション確認
ptta session:current

# セッション一覧
ptta session:list

# セッション終了
ptta session:end

# セッション詳細表示
ptta session:show <session_id>
```

### 2. イベント記録

```bash
# ユーザーメッセージを記録
ptta log:user "認証機能を追加してください"

# Claudeの返答を記録
ptta log:assistant "JWT認証を実装します"

# 思考プロセスを記録
ptta log:thinking "認証にはJWTを使用し、middlewareで検証する設計が適切" --context "authentication"

# コード変更の意図を記録（編集前）
ptta log:intention src/auth.ts --reason "JWT検証ミドルウェアを追加"

# ファイル編集結果を記録（編集後）
ptta log:edit src/auth.ts --action edit

# ツール使用を記録
ptta log:tool "Read" --params '{"file_path": "src/auth.ts"}'
```

### 3. 履歴表示・検索

```bash
# イベント履歴表示（タイムライン）
ptta history

# 最新50件を表示
ptta history --limit 50

# 特定タイプのイベントのみ
ptta history --type user_message

# 全文検索
ptta search "認証"
ptta search "JWT"

# ファイルの変更履歴
ptta file:history src/auth.ts
```

### 4. 統計情報・エクスポート

```bash
# 統計情報表示
ptta stats

# JSON形式でエクスポート
ptta export

# 特定ファイルの履歴をエクスポート
ptta export:file src/auth.ts
```

### 5. WebUI

```bash
# WebUI起動（デフォルト: ポート3737）
ptta web

# カスタムポート
ptta web --port 8080
```

ブラウザで http://localhost:3737 を開くと、以下の機能が利用できます：

- **セッション一覧**: すべてのセッションを表示、統計情報
- **セッション詳細**: タイムライン形式でイベントを表示
- **検索**: 全文検索でイベントを検索

## 📊 データモデル

### イベントストリーム型

```
Session (セッション = Claude Codeの1セッション)
  └── Event (イベント = 時系列の出来事)
      ├── user_message (ユーザーの発言)
      ├── assistant_message (Claudeの返答)
      ├── thinking (Claudeの思考)
      ├── code_intention (コード変更の意図) ← 編集前
      ├── file_edit (実際のファイル編集) ← 編集後
      └── tool_use (ツール使用ログ)
```

### 6つのイベントタイプ

1. **user_message**: ユーザーからの指示・質問
2. **assistant_message**: Claudeの返答
3. **thinking**: Claudeの思考プロセス（thinkingブロック）
4. **code_intention**: コード変更の意図（変更前に記録）
5. **file_edit**: 実際のファイル編集結果
6. **tool_use**: ツールの使用記録

## 🤖 Claude Code との統合

### セッション開始時の推奨フロー

```bash
# 1. セッション開始
ptta session:start

# 2. 前回のセッションを確認
ptta session:list --limit 5

# 3. 特定ファイルの履歴を確認
ptta file:history src/index.ts

# 4. 最近のイベントを確認
ptta history --limit 20
```

### コード編集時の推奨フロー

```bash
# STEP 1: 編集の意図を記録
ptta log:intention src/auth.ts --reason "JWT検証ミドルウェアを追加してセキュリティを強化"

# STEP 2: 実際にファイルを編集（Claude CodeのEditツールなど）
# ... ファイル編集 ...

# STEP 3: 編集結果を記録
ptta log:edit src/auth.ts --action edit
```

### セッション終了時

```bash
# セッション終了
ptta session:end

# エクスポート（必要に応じて）
ptta export --output session_summary.json
```

## 📌 Claude Codeでの効果的な使い方

### CLAUDE.mdへの追加推奨

プロジェクトの `CLAUDE.md` に以下のセクションを追加することで、Claude Codeが自動的にpttaを使用するようになります：

```markdown
## ptta使用ルール（必須）

このリポジトリで作業する際は、**必ず以下のルールに従ってpttaを使用してください**：

### セッション開始時（必須）
1. `ptta session:start` でセッションを開始
2. `ptta history --limit 20` で前回の作業内容を確認
3. 前回の続きの場合は `ptta file:history <path>` で関連ファイルの履歴を確認

### ユーザーからの指示を受けた時（必須）
- `ptta log:user "<message>"` でユーザーの発言を記録

### 作業中（推奨）
- 重要な判断時: `ptta log:thinking "<thought>" --context "<context>"`
- 自分の返答: `ptta log:assistant "<message>"`

### ファイル編集時（必須）
**Intent → Edit フローを厳守**：
1. 編集前: `ptta log:intention <file_path> --reason "<理由>"`
2. 実際にファイルを編集（Editツール使用）
3. 編集後: `ptta log:edit <file_path> --action edit`

### セッション終了時（必須）
- `ptta session:end` でセッションを終了
```

### 作業指示時のプロンプト例

#### 初回作業時

```markdown
このリポジトリではpttaというAI外部記憶装置を使用しています。
必ず以下の手順で作業を開始してください：

1. `ptta session:start` でセッションを開始
2. `ptta history --limit 20` で前回の作業内容を確認
3. ファイル編集時は必ず Intent → Edit フロー：
   - 編集前: `ptta log:intention <file> --reason "<理由>"`
   - 編集実行
   - 編集後: `ptta log:edit <file> --action edit`
4. 作業完了時: `ptta session:end`

それでは、[具体的な作業内容]をお願いします。
```

#### 継続作業時

```markdown
前回の続きから作業を再開します。
まず `ptta session:start` と `ptta history --limit 30` で前回の内容を確認してから、
[具体的な作業内容]を進めてください。

Intent → Edit フローを忘れずに。
```

#### 簡潔版（リマインダー）

```markdown
[作業内容の指示]

※ pttaで記録（session:start → intention → edit → session:end）
```

### 実践的なフロー例

完全な作業フローの例：

```bash
# 1. セッション開始
ptta session:start

# 2. 前回の確認
ptta history --limit 20

# 3. ユーザー指示の記録
ptta log:user "認証機能を追加してください"

# 4. 作業方針の記録
ptta log:assistant "JWT認証を実装します。src/auth.tsにミドルウェアを追加します"

# 5. 思考プロセスの記録
ptta log:thinking "セキュリティを考慮し、JWTの有効期限は24時間に設定" --context "authentication"

# 6. ファイル編集（3ステップ）
ptta log:intention src/auth.ts --reason "JWT検証ミドルウェアを追加"
# ... 実際の編集 ...
ptta log:edit src/auth.ts --action edit

# 7. セッション終了
ptta session:end
```

### ベストプラクティス

1. **セッション開始を忘れない**: 毎回 `ptta session:start` から始める
2. **Intent → Edit フローを必ず守る**: これにより変更理由が明確になる
3. **思考プロセスを記録**: 重要な判断は `log:thinking` で保存
4. **定期的に履歴確認**: `ptta history` で作業の流れを把握
5. **セッション終了を明示**: `ptta session:end` で区切りをつける

### トラブルシューティング

**Q: セッションを開始し忘れた場合は？**
A: いつでも `ptta session:start` を実行できます。既存のアクティブセッションがある場合は警告が表示されます。

**Q: Intent を記録せずに編集してしまった場合は？**
A: 編集後でも `ptta log:intention` を実行できますが、できるだけ編集前に記録することを推奨します。

**Q: 前回のセッションを確認するには？**
A: `ptta session:list --limit 10` で最近のセッションを確認し、`ptta session:show <id>` で詳細を表示できます。

## 💾 データ保存場所

```
~/.ptta/ptta.db
```

すべてのセッションとイベントが単一のSQLiteデータベースに保存されます。

## 🔧 技術スタック

### バックエンド
- **言語**: TypeScript
- **ランタイム**: Node.js
- **データベース**: SQLite (better-sqlite3)
- **CLIフレームワーク**: Commander.js
- **WebAPI**: Hono
- **全文検索**: FTS5 (SQLite)

### フロントエンド（WebUI）
- **フレームワーク**: React 19
- **ルーティング**: React Router v7
- **状態管理**: TanStack React Query
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: shadcn/ui
- **ビルドツール**: Vite

## 📚 詳細ドキュメント

- [DESIGN_V2.md](./DESIGN_V2.md) - 設計仕様書
- [CLAUDE.md](./CLAUDE.md) - Claude Code向けガイド

## 🔄 v1からの移行

**v2は完全な再設計**です。v1（タスク管理）とv2（外部記憶装置）には互換性がありません。

### 主な変更点

| v1 | v2 |
|---|---|
| Workspace → Task → Todo → Action | Session → Event |
| タスク管理 | AIの外部記憶装置 |
| 4階層構造 | イベントストリーム型 |
| task:*, todo:*, action:* コマンド | session:*, log:*, history, search コマンド |

v1を使用している場合は、データベースのバックアップを取ってからv2をご利用ください。

## 📜 バージョン履歴

### v2.0.0 (Current)

- 🎉 **完全な再設計**: タスク管理 → AIの外部記憶装置へ
- 🎬 **イベントストリーム型**: Session → Event データモデル
- 💭 **思考プロセス記録**: thinking イベントタイプ
- 📝 **Intent → Edit フロー**: コード変更意図の明示的記録
- 🔍 **FTS5全文検索**: 日本語・英語ハイブリッド検索
- 🌐 **WebUI v2**: React 19 + Hono + タイムライン表示
- ⚡ **高速化**: better-sqlite3による同期処理

### v0.2.x (Legacy)

- v1実装（タスク管理CLI）

## 🤝 貢献

プルリクエストを歓迎します！

## 🔗 リンク

- **GitHub**: [https://github.com/nysg/ptta](https://github.com/nysg/ptta)
- **npm**: [https://www.npmjs.com/package/@nysg/ptta](https://www.npmjs.com/package/@nysg/ptta)

## 📄 ライセンス

MIT

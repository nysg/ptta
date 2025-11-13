# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

**ptta v2.0 (Project, Task, Todo, Action)** は、**AIのための外部記憶装置**です。

Claude Codeなどのクライシェント間で**会話・思考・コード変更履歴**を永続化し、コンテキストウィンドウを節約するために設計されています。

### v2.0の目的

- **コンテキストウィンドウ節約**: セッション間で完全な履歴を保存・参照
- **完全な履歴保存**: 要約ではなく、実際の会話、思考プロセス、コード編集を保存
- **AIファースト設計**: AIが読み取りやすく、書き込みやすいイベントストリーム型データ構造

### v2の根本的な変更点

| v1 (旧) | v2 (新) |
|---------|---------|
| **目的**: タスク管理CLI | **目的**: AIの外部記憶装置 |
| **データ**: Workspace → Task → Todo → Action | **データ**: Session → Event |
| **用途**: Todoリスト管理 | **用途**: 会話・思考・コード変更の記録 |
| **コマンド**: task:*, todo:*, action:* | **コマンド**: session:*, log:*, history, search |

v2は**完全な再設計**です。v1とは互換性がありません。

## アーキテクチャ

### データモデル: イベントストリーム型

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

すべての活動を**時系列のイベント**として記録します。

### 6つのイベントタイプ

1. **user_message**: ユーザーからの指示・質問
2. **assistant_message**: Claudeの返答
3. **thinking**: Claudeの思考プロセス（thinkingブロック）
4. **code_intention**: コード変更の意図（変更前に記録）
5. **file_edit**: 実際のファイル編集結果
6. **tool_use**: ツールの使用記録

## 技術スタック

- **言語**: TypeScript
- **データベース**: SQLite (better-sqlite3)
- **CLI**: Commander.js
- **WebAPI**: Hono
- **WebUI**: React 19 + Vite + Tailwind CSS + shadcn/ui
- **全文検索**: FTS5 (日本語・英語ハイブリッド)

## プロジェクト構造

```
ptta/
├── src/
│   └── v2/                    # v2実装（すべてここ）
│       ├── types.ts           # TypeScript型定義
│       ├── database.ts        # データベース層（PttaDatabase）
│       ├── utils.ts           # ユーティリティ関数
│       ├── file-editor.ts     # ファイル編集（Intent → Edit）
│       ├── cli.ts             # CLIエントリーポイント
│       ├── web.ts             # WebUI APIサーバー（Hono）
│       └── commands/          # CLIコマンド群
│           ├── session.ts
│           ├── log.ts
│           ├── history.ts
│           ├── search.ts
│           ├── file.ts
│           ├── stats.ts
│           ├── export.ts
│           └── web.ts
├── web/client/                # WebUI フロントエンド
│   ├── src/
│   │   ├── App.tsx           # メインアプリケーション
│   │   └── lib/api.ts        # v2 APIクライアント
│   └── dist/                  # ビルド出力
├── bin/ptta.js               # 実行可能ファイル
├── DESIGN_V2.md              # v2設計書
└── README.md                 # ユーザー向けドキュメント
```

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# TypeScriptビルド
npm run build

# WebUIビルド（フロントエンド）
npm run web:build

# 全体ビルド
npm run build:all

# 開発モード（ウォッチ）
npm run dev

# テスト
npm test

# ローカルでテスト
node bin/ptta.js --help

# グローバルにリンク
npm link
```

## CLIコマンド（v2）

### セッション管理

```bash
ptta session:start              # セッション開始
ptta session:end                # セッション終了
ptta session:list               # セッション一覧
ptta session:show <id>          # セッション詳細
ptta session:current            # 現在のアクティブセッション
```

### イベント記録

```bash
ptta log:user <message>                  # ユーザーメッセージ
ptta log:assistant <message>             # アシスタント返答
ptta log:thinking <content>              # 思考プロセス
ptta log:intention <file_path>           # コード変更意図（編集前）
ptta log:edit <file_path>                # ファイル編集（編集後）
ptta log:tool <tool_name>                # ツール使用
```

### 履歴・検索

```bash
ptta history                     # イベント履歴（タイムライン）
ptta history --limit 50          # 最新50件
ptta history --type user_message # 特定タイプのみ

ptta search "キーワード"          # 全文検索
ptta file:history <file_path>   # ファイル変更履歴
```

### その他

```bash
ptta stats                      # 統計情報
ptta export                     # JSON形式でエクスポート
ptta export:file <file_path>    # ファイル履歴エクスポート
ptta web                        # WebUI起動（ポート3737）
```

## Claude Codeでの推奨使用パターン

### 1. セッション開始時

```bash
# セッション開始
ptta session:start

# 前回のセッションを確認
ptta session:list --limit 5

# 最近のイベントを確認
ptta history --limit 20
```

**理由**: 前回の作業内容を把握し、継続性を保つ

### 2. ユーザーからの指示を受けた時

```bash
# ユーザーメッセージを記録
ptta log:user "認証機能を追加してください"
```

**理由**: ユーザーの要求を明示的に記録

### 3. 返答を決定した時

```bash
# アシスタントの返答を記録
ptta log:assistant "JWT認証を実装します。まずミドルウェアを追加します。"
```

**理由**: Claudeの意図と計画を記録

### 4. 思考プロセスを記録したい時

```bash
# 思考内容を記録
ptta log:thinking "認証にはJWTを使用し、middlewareで検証する設計が適切" --context "authentication"
```

**理由**: 設計判断の理由を保存。次回セッションで参照可能

### 5. ファイルを編集する時（重要！）

**Intent → Edit フロー**を必ず守ってください：

```bash
# STEP 1: 編集の意図を先に記録
ptta log:intention src/auth.ts --reason "JWT検証ミドルウェアを追加してセキュリティを強化"

# STEP 2: 実際にファイルを編集（Editツールなど）
# ... ファイル編集 ...

# STEP 3: 編集結果を記録
ptta log:edit src/auth.ts --action edit
```

**理由**:
- 編集の「なぜ」（intention）と「何を」（edit）を分離
- 次回セッションで変更理由を理解できる
- デバッグやレビューが容易

### 6. セッション終了時

```bash
# セッション終了
ptta session:end
```

**理由**: セッションを明示的に終了し、履歴を整理

## ファイル編集の詳細フロー

### プログラムレベルの実装（参考）

`src/v2/file-editor.ts` の `editFile` メソッド:

```typescript
async editFile(sessionId: string, filePath: string, newContent: string, reason: string) {
  // STEP 1: 意図を記録
  const intentionEvent = this.db.createEvent({
    session_id: sessionId,
    type: 'code_intention',
    data: {
      action: 'edit',
      file_path: filePath,
      reason: reason,
      old_content: oldContent,
      new_content: newContent,
      diff: diff
    }
  });

  // STEP 2: 実際の編集
  writeFileSync(absolutePath, newContent);

  // STEP 3: 結果を記録
  const editEvent = this.db.createEvent({
    session_id: sessionId,
    type: 'file_edit',
    data: {
      action: 'edit',
      file_path: filePath,
      old_content: oldContent,
      new_content: newContent,
      diff: diff,
      intention_event_id: intentionEvent.id,
      success: true
    },
    parent_event_id: intentionEvent.id
  });
}
```

このフローにより、すべての編集に「理由」と「結果」が紐づきます。

## データベース設計

### ストレージ

```
~/.ptta/ptta.db
```

単一のSQLiteデータベースにすべてのセッション・イベントを保存。

### 主要テーブル

```sql
-- セッション
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,              -- UUID
  workspace_path TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  metadata TEXT                     -- JSON
);

-- イベント
CREATE TABLE events (
  id TEXT PRIMARY KEY,              -- UUID
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,        -- セッション内の順序
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,               -- イベントタイプ
  data TEXT NOT NULL,               -- JSON（イベント固有データ）
  parent_event_id TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- 全文検索（FTS5）
CREATE VIRTUAL TABLE events_fts USING fts5(
  event_id UNINDEXED,
  session_id UNINDEXED,
  type UNINDEXED,
  content,
  tokenize = 'trigram case_sensitive 0'
);
```

### FTS5検索の実装

`src/v2/database.ts:383` の `searchEvents()`:

```typescript
searchEvents(query: string, sessionId?: string, type?: EventType): EventSearchResult[] {
  // Try FTS5 MATCH first (fast)
  try {
    const rows = stmt.all(...params);
    if (rows.length > 0) return rows.map(...);
  } catch (error) {
    // Fall through to LIKE
  }

  // Fallback to LIKE for Japanese (always works)
  const likeSql = `WHERE fts.content LIKE ?`;
  return likeStmt.all(`%${query}%`).map(...);
}
```

ハイブリッド方式により、英語は高速なFTS5、日本語はLIKEで確実に検索できます。

## WebUI

### 起動

```bash
ptta web --port 3737
```

ブラウザで http://localhost:3737 を開く。

### 機能

1. **セッション一覧** (`/`):
   - すべてのセッション表示
   - 統計情報（セッション数、イベント数、ファイル編集数）
   - Active/All フィルター

2. **セッション詳細** (`/sessions/:id`):
   - イベントのタイムライン表示
   - イベントタイプ別の色分けバッジ
   - ファイル編集のdiff表示

3. **検索** (`/search`):
   - 全文検索
   - 検索結果からセッションへジャンプ

### API エンドポイント

```
GET  /api/sessions                # セッション一覧
GET  /api/sessions/:id            # セッション詳細
POST /api/sessions                # セッション作成
PATCH /api/sessions/:id           # セッション更新

GET  /api/sessions/:id/events     # セッションのイベント一覧
GET  /api/events/:id              # イベント詳細
POST /api/events                  # イベント作成

GET  /api/search?q=<query>        # 全文検索
GET  /api/files/history?path=<>   # ファイル履歴
GET  /api/stats                   # 統計情報
```

## 実装済み機能（v2.0）

- ✅ イベントストリーム型データモデル
- ✅ 6種類のイベントタイプ
- ✅ Intent → Edit フロー
- ✅ FTS5全文検索（日本語・英語ハイブリッド）
- ✅ 全CLIコマンド（session, log, history, search, file, stats, export, web）
- ✅ WebUI（Hono + React 19）
- ✅ セッション管理・イベント記録・検索機能

## 重要な注意事項

1. **v2は完全な再設計**: v1のコマンドは使用できません
2. **Intent → Edit フローを守る**: ファイル編集時は必ず intention → edit の順で記録
3. **思考プロセスを記録**: 重要な判断理由は `log:thinking` で保存
4. **セッション管理**: セッション開始・終了を明示的に行う
5. **不明点があったら質問すること**: 不確実な実装は避け、ユーザーに確認を取る

## トラブルシューティング

### データベースの場所

```bash
ls ~/.ptta/
```

### 全コマンドのヘルプ

```bash
ptta --help
ptta session:start --help
ptta log:intention --help
```

### デバッグモード

```bash
DEBUG=1 ptta history
```

### WebUIのビルド

```bash
cd web/client
npm install
npm run build
```

## まとめ

ptta v2.0は、Claude Codeのセッション間で**完全な記憶**を保持するための外部記憶装置です。

会話・思考・コード変更を記録することで、次回のセッションで前回の作業を完全に理解でき、コンテキストウィンドウを大幅に節約できます。

**必ず Intent → Edit フローを守り**、すべての重要な活動をイベントとして記録してください。

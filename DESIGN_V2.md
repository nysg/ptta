# ptta v2.0 設計書

**AIのための外部記憶装置 (External Memory for AI)**

## コンセプト

pttaは「タスク管理ツール」から「**AIのための外部記憶装置**」へと生まれ変わります。

### 目的

- **コンテキストウィンドウ節約**: Claude Codeのセッション間で会話・思考・コード変更履歴を永続化
- **完全な履歴保存**: 要約ではなく、実際の会話、思考プロセス、コード編集を保存
- **AIファースト設計**: AIが読み取りやすく、書き込みやすいデータ構造

### 保存する情報

1. **会話履歴**: ユーザーとClaudeのやりとり
2. **思考履歴**: Claudeの思考プロセス（thinkingブロック）
3. **コード変更履歴**:
   - 変更の意図（なぜ変更するか）
   - 実際の変更内容（diff + 全内容）

---

## データモデル

### 基本構造: イベントストリーム型

すべての活動を**時系列のイベント**として記録します。

```
Session (セッション)
  └── Event (イベント) - 時系列
        ├── user_message (ユーザーの発言)
        ├── assistant_message (Claudeの返答)
        ├── thinking (Claudeの思考)
        ├── code_intention (コード変更の意図) ← 編集前
        ├── file_edit (実際のファイル編集) ← 編集後
        └── tool_use (ツール使用ログ)
```

---

## データ定義

### 1. Session (セッション)

Claude Codeの1セッション = 1つの記憶単位

```typescript
interface Session {
  id: string;              // UUID
  workspace_path: string;  // ワークスペースのパス
  started_at: string;      // ISO 8601 timestamp
  ended_at: string | null; // null = 実行中
  metadata: {
    branch?: string;       // gitブランチ
    initial_context?: string;
    tags?: string[];       // 検索用タグ
    [key: string]: any;    // 拡張可能
  };
}
```

### 2. Event (イベント)

セッション内で起きたすべての出来事

```typescript
interface Event {
  id: string;              // UUID
  session_id: string;      // 所属するセッション
  sequence: number;        // セッション内の順序（1, 2, 3...）
  timestamp: string;       // ISO 8601 timestamp
  type: EventType;         // イベントタイプ
  data: EventData;         // type別の構造化データ
  parent_event_id?: string; // 因果関係（このイベントを引き起こした親）
}

type EventType =
  | 'user_message'
  | 'assistant_message'
  | 'thinking'
  | 'code_intention'
  | 'file_edit'
  | 'tool_use';
```

### 3. EventData (type別)

#### user_message
```typescript
interface UserMessageData {
  content: string;         // ユーザーの発言内容
}
```

#### assistant_message
```typescript
interface AssistantMessageData {
  content: string;         // Claudeの返答内容
  tool_calls?: Array<{     // 使用したツール（オプション）
    tool: string;
    args: any;
  }>;
}
```

#### thinking
```typescript
interface ThinkingData {
  content: string;         // 思考の内容
  context?: string;        // 何について考えているか
}
```

#### code_intention ⭐
```typescript
interface CodeIntentionData {
  action: 'create' | 'edit' | 'delete';
  file_path: string;       // 対象ファイル（絶対パス）
  reason: string;          // なぜこの変更をするか
  old_content?: string;    // 編集前の内容（全文）
  new_content?: string;    // 編集後の内容（全文）
  diff?: string;           // unified diff形式
}
```

#### file_edit ⭐
```typescript
interface FileEditData {
  action: 'create' | 'edit' | 'delete';
  file_path: string;       // 対象ファイル（絶対パス）
  old_content?: string;    // 編集前の内容（全文）
  new_content?: string;    // 編集後の内容（全文）
  diff: string;            // unified diff形式
  intention_event_id?: string; // 対応するcode_intentionのID
  success: boolean;        // 編集が成功したか
  error_message?: string;  // エラーメッセージ（失敗時）
}
```

#### tool_use
```typescript
interface ToolUseData {
  tool: string;            // 'Bash', 'Read', 'Grep', etc.
  parameters: any;         // ツールのパラメータ
  result?: any;            // 実行結果
  duration_ms?: number;    // 実行時間
  success?: boolean;       // 成功/失敗
}
```

---

## コード編集フロー（Intent → Edit）

**重要**: コード編集は**意図を先に記録**してから実際の編集を行います。

```
1. Claudeが編集を決定
   ↓
2. code_intention イベントを記録（編集前）
   - 変更理由
   - 変更前後の内容
   - diff
   ↓
3. 実際のファイル編集を実行
   ↓
4. file_edit イベントを記録（編集後）
   - 実際の結果
   - intention_event_id でリンク
```

### 実装例

```typescript
async function editFile(
  filePath: string,
  oldContent: string,
  newContent: string,
  reason: string
): Promise<void> {

  // STEP 1: 意図を記録
  const intentionEvent = await db.createEvent({
    type: 'code_intention',
    data: {
      action: 'edit',
      file_path: filePath,
      reason: reason,
      old_content: oldContent,
      new_content: newContent,
      diff: generateDiff(oldContent, newContent)
    }
  });

  // STEP 2: 実際の編集
  let success = false;
  let errorMessage: string | undefined;

  try {
    await fs.writeFile(filePath, newContent);
    success = true;
  } catch (error) {
    errorMessage = error.message;
  }

  // STEP 3: 結果を記録
  await db.createEvent({
    type: 'file_edit',
    data: {
      action: 'edit',
      file_path: filePath,
      old_content: oldContent,
      new_content: newContent,
      diff: generateDiff(oldContent, newContent),
      intention_event_id: intentionEvent.id,
      success,
      error_message: errorMessage
    },
    parent_event_id: intentionEvent.id
  });
}
```

---

## データベース設計（SQLite）

### テーブル構造

```sql
-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  workspace_path TEXT NOT NULL,
  started_at TEXT NOT NULL,  -- ISO 8601
  ended_at TEXT,             -- ISO 8601, NULL = running
  metadata TEXT,             -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_sessions_workspace ON sessions(workspace_path);
CREATE INDEX idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX idx_sessions_ended ON sessions(ended_at DESC);

-- Events
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  timestamp TEXT NOT NULL,   -- ISO 8601
  type TEXT NOT NULL,
  data TEXT NOT NULL,        -- JSON
  parent_event_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_event_id) REFERENCES events(id)
);

CREATE INDEX idx_events_session ON events(session_id, sequence);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX idx_events_parent ON events(parent_event_id);

-- Full Text Search (FTS5)
CREATE VIRTUAL TABLE events_fts USING fts5(
  event_id UNINDEXED,
  session_id UNINDEXED,
  type UNINDEXED,
  content,
  tokenize = 'unicode61'
);

-- FTS5用のトリガー（自動更新）
CREATE TRIGGER events_fts_insert AFTER INSERT ON events BEGIN
  INSERT INTO events_fts(event_id, session_id, type, content)
  VALUES (
    new.id,
    new.session_id,
    new.type,
    json_extract(new.data, '$.content') || ' ' ||
    json_extract(new.data, '$.reason') || ' ' ||
    json_extract(new.data, '$.file_path')
  );
END;

CREATE TRIGGER events_fts_delete AFTER DELETE ON events BEGIN
  DELETE FROM events_fts WHERE event_id = old.id;
END;
```

### ストレージ

- パス: `~/.ptta/ptta.db`
- ワークスペースごとのテーブル分離は**廃止**
- すべてのセッション・イベントを1つのDBで管理
- workspace_pathで論理的に分離

---

## CLI コマンド仕様

### セッション管理

```bash
# セッション開始
ptta session:start [--workspace <path>] [--branch <branch>]

# 現在のセッション終了
ptta session:end [--session <id>]

# セッション一覧
ptta session:list [--workspace <path>] [--json]

# セッション詳細表示
ptta session:show <id> [--json]

# 現在のアクティブセッション表示
ptta session:current [--workspace <path>]
```

### イベント記録

```bash
# ユーザーメッセージ記録
ptta log:user <message> [--session <id>]

# アシスタントメッセージ記録
ptta log:assistant <message> [--session <id>]

# 思考内容記録
ptta log:thinking <content> [--session <id>] [--context <context>]

# コード変更意図記録
ptta log:intention <file_path> --reason <reason> [--session <id>]

# ファイル編集記録
ptta log:edit <file_path> --action <create|edit|delete> [--session <id>]

# ツール使用記録
ptta log:tool <tool_name> --params <json> [--result <json>] [--session <id>]
```

### 履歴表示・検索

```bash
# セッション履歴表示（タイムライン）
ptta history [--session <id>] [--type <type>] [--limit <n>] [--json]

# ファイルの変更履歴
ptta file:history <file_path> [--workspace <path>] [--json]

# 全文検索
ptta search <query> [--session <id>] [--type <type>] [--json]

# 統計情報
ptta stats [--workspace <path>] [--session <id>]
```

### エクスポート

```bash
# JSON形式でエクスポート
ptta export [--session <id>] [--output <file>]

# 特定ファイルに関連するイベントをエクスポート
ptta export:file <file_path> [--output <file>]
```

### ファイル編集統合コマンド

```bash
# Intent記録 → エディタ起動 → Edit記録を一連で実行
ptta edit <file_path> --reason <reason> [--editor <editor>]

# または、既存エディタのラッパーとして
ptta edit:record <file_path> --reason <reason> -- <actual_edit_command>
```

### WebUI

```bash
# WebUI起動
ptta web [--port <port>] [--workspace <path>]
```

---

## API設計（WebUI用）

### REST API (Hono)

```
GET  /api/sessions                 - セッション一覧
GET  /api/sessions/:id             - セッション詳細
POST /api/sessions                 - セッション作成
PATCH /api/sessions/:id            - セッション更新（終了など）

GET  /api/sessions/:id/events      - セッションのイベント一覧
GET  /api/events/:id               - イベント詳細
POST /api/events                   - イベント作成

GET  /api/search                   - 全文検索 (query parameter: q)
GET  /api/files/:path/history      - ファイル履歴
GET  /api/stats                    - 統計情報
```

---

## WebUI設計

### ページ構成

#### 1. Sessions Page (`/`)
- セッション一覧
- ワークスペース別にグループ化
- フィルター: アクティブ/終了済み
- 各セッション: 開始日時、イベント数、最終更新

#### 2. Session Detail Page (`/sessions/:id`)
- **タイムライン表示**
  - 会話（吹き出し形式）
    - ユーザー: 左寄せ、青
    - アシスタント: 右寄せ、緑
  - 思考（折りたたみ可能、アイコン付き）
  - コード変更
    - intention: 意図を表示（吹き出し）
    - file_edit: diffビュー（Monaco Editorなど）
  - ツール使用（ログ形式）
- **フィルター**
  - イベントタイプ別（チェックボックス）
  - ファイルパス別
- **ナビゲーション**
  - 時系列スクロール
  - イベントへのジャンプ

#### 3. File History Page (`/files`)
- ファイルツリー表示
- クリックでファイル履歴表示
- 各編集:
  - タイムスタンプ
  - 変更理由（intention）
  - diffビュー

#### 4. Search Page (`/search`)
- 全文検索フォーム
- 検索結果一覧
- 結果からセッション詳細へのリンク
- ハイライト表示

---

## 技術スタック

### バックエンド
- **言語**: TypeScript
- **ランタイム**: Node.js
- **データベース**: SQLite (better-sqlite3)
- **CLIフレームワーク**: commander
- **WebAPI**: Hono
- **UUID生成**: uuid
- **Diff生成**: diff (or similar library)

### フロントエンド
- **フレームワーク**: React 18
- **ルーティング**: React Router v6
- **状態管理**: TanStack React Query
- **スタイリング**: Tailwind CSS
- **UIコンポーネント**: shadcn/ui
- **コードビューワー**: Monaco Editor or react-diff-view
- **ビルドツール**: Vite

---

## 実装フェーズ

### Phase 1: コア実装
1. データモデル定義（types.ts）
2. データベース層（database.ts）
3. 基本CLIコマンド（session, log）
4. FTS5検索実装

### Phase 2: CLI拡張
1. 履歴表示コマンド
2. 検索コマンド
3. エクスポートコマンド
4. ファイル編集統合コマンド

### Phase 3: WebUI
1. バックエンドAPI（Hono）
2. フロントエンド実装
   - Sessions一覧
   - Session詳細（タイムライン）
   - File履歴
   - 検索

### Phase 4: 仕上げ
1. テスト作成・実行
2. ドキュメント整備
3. ビルド・動作確認
4. npm公開準備

---

## AIとの統合方法

### Claude Codeでの使用パターン

#### セッション開始時
```bash
# セッション開始
ptta session:start

# 前回のセッションを確認
ptta session:show $(ptta session:list --json | jq -r '.[0].id')

# または特定ファイルの履歴を確認
ptta file:history src/index.ts
```

#### 開発中
```bash
# ユーザーからの指示を記録
ptta log:user "認証機能を追加してください"

# Claudeの返答を記録
ptta log:assistant "認証機能を実装します。まずJWTトークンの検証ロジックを追加します。"

# 思考プロセスを記録
ptta log:thinking "認証にはJWTを使用し、middlewareで検証する設計が適切" --context "authentication"

# ファイル編集（意図を先に記録）
ptta log:intention src/auth.ts --reason "JWT検証ミドルウェアを追加"

# 実際の編集（Claude Codeの Edit ツール使用後）
ptta log:edit src/auth.ts --action edit
```

#### セッション終了時
```bash
# セッション終了
ptta session:end

# エクスポート（次回セッションで参照可能）
ptta export --output session_summary.json
```

### CLAUDE.mdへの記載（推奨プロンプト）

```markdown
## ptta使用ガイド

pttaはAIのための外部記憶装置です。以下のルールに従ってください：

1. **セッション開始時**: `ptta session:start` を実行
2. **ユーザーメッセージ後**: `ptta log:user "<message>"` で記録
3. **自分の返答後**: `ptta log:assistant "<response>"` で記録
4. **思考プロセス**: `ptta log:thinking "<thought>"` で思考内容を保存
5. **ファイル編集前**: `ptta log:intention <file> --reason "<why>"` で意図を記録
6. **ファイル編集後**: `ptta log:edit <file> --action edit` で結果を記録
7. **セッション終了時**: `ptta session:end` を実行

これにより、次回のセッションで完全な履歴を参照できます。
```

---

## まとめ

新しいpttaは：

- ✅ **AIファースト**: 会話・思考・コード変更を時系列で完全記録
- ✅ **Intent-driven**: 変更理由を明示的に記録
- ✅ **全文保存**: 要約ではなく実際の内容を保存
- ✅ **FTS検索**: 高速な全文検索
- ✅ **WebUI**: 人間が確認できる可視化
- ✅ **シンプル**: 複雑な階層構造を排除

これにより、Claude Codeのコンテキストウィンドウを効率的に節約しながら、セッション間で完全な記憶を維持できます。

# ptta (Project, Task, Todo, Action)

AIファーストなタスク管理CLI - Claude Codeの外部メモリーストレージ

## 特徴

- 📋 **階層的なタスク管理**: プロジェクト → タスク → サブタスク
- 🤖 **AI最適化**: JSON形式での構造化データ、Claude Codeが読み取りやすい設計
- 💾 **永続化**: better-sqlite3による高速なデータ管理
- 📁 **パスごとの管理**: ワークスペースごとに独立したプロジェクト管理
- 🔍 **効率的なクエリ**: Claude Codeのコンテキストウィンドウを節約

## インストール

```bash
npm install -g ptta
```

または、ローカルでの開発:

```bash
npm install
npm run build
npm link
```

## 基本的な使い方

### プロジェクト管理

```bash
# プロジェクト作成
ptta project:add "Webアプリ開発" -d "新しいWebアプリケーションの開発" -P high

# プロジェクト一覧
ptta project:list

# プロジェクト詳細（階層表示）
ptta project:show 1

# JSON形式で表示
ptta project:list --json
```

### タスク管理

```bash
# タスク作成
ptta task:add 1 "認証機能の実装" -d "JWT認証を実装する" -P high

# タスク一覧
ptta task:list

# プロジェクト1のタスクのみ表示
ptta task:list -P 1

# タスクのステータス更新
ptta task:update 1 -s in_progress

# タスク完了
ptta task:update 1 -s done
```

### サブタスク管理

```bash
# サブタスク追加
ptta subtask:add 1 "ログイン画面のUI作成"
ptta subtask:add 1 "JWT生成ロジックの実装"

# サブタスク完了
ptta subtask:done 1
```

### ワークスペース管理

```bash
# ワークスペース一覧
ptta workspace:list

# 特定のワークスペースで実行
ptta -p /path/to/project project:list
```

### データエクスポート

```bash
# 全データをJSON出力
ptta export

# 特定プロジェクトをファイルに出力
ptta export -P 1 -o project1.json

# 統計情報
ptta stats
```

## Claude Codeとの統合

### 1. 作業開始時に現在のタスクを確認

```bash
# 進行中のタスク一覧をJSON形式で取得
ptta query tasks -s in_progress
```

### 2. プロジェクト全体の把握

```bash
# プロジェクト階層をJSON形式で取得
ptta query hierarchy -i 1
```

### 3. 作業完了後の記録

```bash
# タスク完了とサマリー追加
ptta task:update 5 -s done
ptta summary:add task 5 "API統合が完了。エラーハンドリングとレート制限を実装。"
```

### 4. AIクエリコマンド（JSON形式）

```bash
# 全プロジェクト
ptta query projects

# 全タスク
ptta query tasks

# 特定プロジェクトの階層
ptta query hierarchy -i 1

# 全データ
ptta query all

# 統計情報
ptta query stats

# ワークスペース一覧
ptta query workspaces
```

## データの保存場所

```
~/.ptta/ptta.db
```

## ステータス

### プロジェクト
- `active`: アクティブ（進行中）
- `completed`: 完了
- `archived`: アーカイブ済み

### タスク/サブタスク
- `todo`: 未着手
- `in_progress`: 進行中
- `done`: 完了

## 優先度

- `low`: 低
- `medium`: 中（デフォルト）
- `high`: 高

## ライセンス

MIT

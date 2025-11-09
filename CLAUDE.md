# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**ptta (Project, Task, Todo, Action)** は、Claude CodeなどのCLI AIが参照できるAIファーストなタスク管理CLIアプリケーションです。

### 目的

- Claude Codeのコンテキストウィンドウ節約が主な目的
- Claude CodeがこのコマンドにアクセスしてTodoを管理
- AIが読み取りやすい構造化データの提供

### 重要な設計方針

- **ストレージ**: SQLite (`~/.ptta/ptta.db`)
- **ワークスペース管理**: Claude Codeと同様にパスごとにワークスペースを管理
- **テーブル構造**: ワークスペースごとにテーブルを持つ
- **階層構造**: `Workspace → Task → Todo → Action` の4階層で管理
- **WebUI**: `ptta web` コマンドでlocalhostを立ち上げ、タスクの確認・管理が可能
- **インストール**: npmでインストール可能にする

## アーキテクチャ

### データ階層（実装済み）

```
Workspace (ワークスペース = ディレクトリ)
  └── Task (タスク = 大きな単位)
      └── Todo (Todo = 中くらいの単位)
          └── Action (アクション = 最小単位)
```

現在の実装は4階層構造です。Claude Codeのワークスペース概念と整合性を持ち、各レベルで親子関係を持ち、細かい粒度でタスクを管理できます。

### 技術スタック

- **言語**: TypeScript
- **データベース**: better-sqlite3
- **CLI フレームワーク**: commander
- **出力**: chalk (カラー表示)

### 設計ポイント

- **パスごとの分離**: ワークスペースパスをMD5ハッシュ化してテーブル名生成
- **独立したテーブル**: `tasks_{hash}`, `todos_{hash}`, `actions_{hash}`, `summaries_{hash}`
- **JSON出力**: AI統合のためのクエリコマンド (`ptta query`)
- **コンテキスト節約**: 必要な部分だけ取得可能

## プロジェクト構造

```
ptta/
├── src/
│   ├── database.ts    # データベース層 (PttaDatabase クラス)
│   └── cli.ts         # CLIコマンド (commander ベース)
├── bin/
│   └── ptta.js        # 実行可能ファイル
├── dist/              # ビルド出力
├── package.json
├── tsconfig.json
└── README.md
```

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# ビルド
npm run build

# 開発モード（ウォッチ）
npm run dev

# ローカルでテスト
node bin/ptta.js --help

# グローバルにリンク
npm link
```

## 主要なコマンド

### Task管理
- `ptta task:add <title>`: Task作成
- `ptta task:list`: Task一覧
- `ptta task:show <id>`: Task詳細（階層表示）
- `ptta task:update <id>`: Task更新

### Todo管理
- `ptta todo:add <taskId> <title>`: Todo作成
- `ptta todo:list`: Todo一覧
- `ptta todo:update <id>`: Todo更新

### Action管理
- `ptta action:add <todoId> <title>`: Action作成
- `ptta action:done <id>`: Action完了
- `ptta action:update <id>`: Action更新

### AI統合
- `ptta query <type>`: JSON形式でデータ取得
  - types: `tasks`, `todos`, `hierarchy`, `all`, `stats`, `workspaces`
- `ptta export`: JSON形式でエクスポート
- `ptta stats`: 統計情報

### その他
- `ptta summary:add <type> <id> <summary>`: サマリー追加 (type: task/todo/action)
- `ptta workspace:list`: ワークスペース一覧

すべてのコマンドで `-p <path>` オプションでワークスペースパスを指定可能（デフォルト: カレントディレクトリ）

## データベース設計

### ワークスペーステーブル
- `workspaces`: パス管理、ワークスペース情報

### ワークスペースごとのテーブル（動的生成）
- `tasks_{hash}`: Task情報
- `todos_{hash}`: Todo情報
- `actions_{hash}`: Action情報
- `summaries_{hash}`: サマリー情報

テーブル名のハッシュはワークスペースパスのMD5から生成（8文字）

## 実装済み機能

- ✅ 4階層データモデル（Workspace → Task → Todo → Action）
- ✅ WebUI実装（Hono + React + TypeScript + Tailwind CSS + shadcn/ui）
- ✅ `ptta web` コマンド
- ✅ テスト（vitest、80テスト）
- ✅ npm公開（@nysg/ptta）

## 重要な注意事項

**不明点があったら質問すること** - overview.mdに明記されているとおり、不確実な実装は避け、必ずユーザーに確認を取ってください。

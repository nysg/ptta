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
- **プロジェクト管理**: Claude Codeと同様にパスごとにプロジェクトを管理
- **テーブル構造**: プロジェクトごとにテーブルを持つ
- **階層構造**: `Project → Task → Todo → Action` の粒度で管理
- **WebUI**: `ptta web` コマンドでlocalhostを立ち上げ、タスクの確認・管理が可能
- **インストール**: npmでインストール可能にする

## アーキテクチャ

### データ階層（実装済み）

```
Project (プロジェクト)
  └── Task (タスク)
      └── Subtask (サブタスク)
```

現在の実装は3階層構造です。各レベルで親子関係を持ち、細かい粒度でタスクを管理できます。

### 技術スタック

- **言語**: TypeScript
- **データベース**: better-sqlite3
- **CLI フレームワーク**: commander
- **出力**: chalk (カラー表示)

### 設計ポイント

- **パスごとの分離**: ワークスペースパスをMD5ハッシュ化してテーブル名生成
- **独立したテーブル**: `projects_{hash}`, `tasks_{hash}`, `subtasks_{hash}`, `summaries_{hash}`
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

### プロジェクト管理
- `ptta project:add <title>`: プロジェクト作成
- `ptta project:list`: プロジェクト一覧
- `ptta project:show <id>`: プロジェクト詳細（階層表示）
- `ptta project:update <id>`: プロジェクト更新

### タスク管理
- `ptta task:add <projectId> <title>`: タスク作成
- `ptta task:list`: タスク一覧
- `ptta task:update <id>`: タスク更新

### サブタスク管理
- `ptta subtask:add <taskId> <title>`: サブタスク作成
- `ptta subtask:done <id>`: サブタスク完了
- `ptta subtask:update <id>`: サブタスク更新

### AI統合
- `ptta query <type>`: JSON形式でデータ取得
  - types: `projects`, `tasks`, `hierarchy`, `all`, `stats`, `workspaces`
- `ptta export`: JSON形式でエクスポート
- `ptta stats`: 統計情報

### その他
- `ptta summary:add <type> <id> <summary>`: サマリー追加
- `ptta workspace:list`: ワークスペース一覧

すべてのコマンドで `-p <path>` オプションでワークスペースパスを指定可能（デフォルト: カレントディレクトリ）

## データベース設計

### ワークスペーステーブル
- `workspaces`: パス管理、ワークスペース情報

### ワークスペースごとのテーブル（動的生成）
- `projects_{hash}`: プロジェクト情報
- `tasks_{hash}`: タスク情報
- `subtasks_{hash}`: サブタスク情報
- `summaries_{hash}`: サマリー情報

テーブル名のハッシュはワークスペースパスのMD5から生成（8文字）

## 次のステップ（未実装）

- WebUI実装（Hono + React + TypeScript + Tailwind CSS + shadcn/ui）
- `ptta web` コマンド
- テストの追加
- npm公開

## 重要な注意事項

**不明点があったら質問すること** - overview.mdに明記されているとおり、不確実な実装は避け、必ずユーザーに確認を取ってください。

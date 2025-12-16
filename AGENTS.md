# AI-DLC と Spec-Driven Development

AI-DLC（AI Development Life Cycle）上で動く、Kiro 風 Spec Driven Development の実装です。

## プロジェクトメモリ
プロジェクトメモリは、永続的なガイダンス（steering、spec notes、コンポーネント文書など）を保持し、Codex が毎回あなたの標準に従うようにします。パターン・規約・意思決定の「長期的な正」として扱ってください。

- プロジェクト全体のポリシーは `.kiro/steering/` に置きます（例：アーキテクチャ方針、命名規則、セキュリティ制約、技術選定、API標準など）。
- 機能やライブラリ固有のコンテキストは、ローカルの `AGENTS.md` に書きます（例：`src/lib/payments/AGENTS.md`）。
  - そのフォルダに固有のドメイン前提、API契約、テスト規約などを記述します。
  - Codex は作業パスに一致する `AGENTS.md` を自動ロードします。
- Specs notes は各 spec（`.kiro/specs/` 配下）と一緒に置き、仕様策定レベルのワークフローをガイドします。

## プロジェクトコンテキスト

### パス
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering と Specification の違い
**Steering**（`.kiro/steering/`） - プロジェクト全体のルールとコンテキストで AI をガイドする
**Specs**（`.kiro/specs/`） - 個別機能の開発プロセスを形式化する

### アクティブな仕様（Active Specifications）
- アクティブな仕様は `.kiro/specs/` を確認してください
- 進捗確認は `/prompts:kiro-spec-status [feature-name]` を使います

## 開発ガイドライン
- 返答は日本語で生成してください。
- プロジェクトファイルに書き出す Markdown（例：requirements.md, design.md, tasks.md, research.md, 検証レポート）は、各仕様で設定されたターゲット言語で必ず記述してください（`spec.json.language` を参照）。

## 最小ワークフロー（Minimal Workflow）
- Phase 0（任意）:
  - `/prompts:kiro-steering`
  - `/prompts:kiro-steering-custom`
- Phase 1（Specification）:
  - `/prompts:kiro-spec-init "description"`
  - `/prompts:kiro-spec-requirements {feature}`
  - `/prompts:kiro-validate-gap {feature}`（任意：既存コードベース向け）
  - `/prompts:kiro-spec-design {feature} [-y]`
  - `/prompts:kiro-validate-design {feature}`（任意：設計レビュー）
  - `/prompts:kiro-spec-tasks {feature} [-y]`
- Phase 2（Implementation）:
  - `/prompts:kiro-spec-impl {feature} [tasks]`
  - `/prompts:kiro-validate-impl {feature}`（任意：実装後の検証）
- 進捗チェック:
  - `/prompts:kiro-spec-status {feature}`（いつでも使用可）

## 開発ルール
- 承認フロー（3フェーズ）: Requirements → Design → Tasks → Implementation
- 各フェーズで人間のレビューが必要。`-y` は意図的なファストトラック時のみ使用すること
- steering は最新状態を保ち、`/prompts:kiro-spec-status` で整合性を確認すること
- ユーザーの指示に厳密に従い、その範囲内で自律的に行動すること：
  - 必要なコンテキストを収集し、この実行内で依頼内容をエンドツーエンドで完了させる
  - ただし、必須情報が欠けている／指示が致命的に曖昧な場合に限り質問する
- コードコメント（インラインコメント、docstring）は日本語で書くこと（人間のレビュー可読性を優先）。
- 「意図がコードから読み取りづらい箇所」には、なぜそうしたかが分かる短いコメントを残すこと（What ではなく Why を優先）。
- 関数・クラス・公開APIには、役割・前提・入出力・副作用（必要ならエラー条件）を簡潔に説明する docstring/コメントを付けること。

## Steering 設定
- `.kiro/steering/` 全体をプロジェクトメモリとしてロードする
- デフォルトファイル: `product.md`, `tech.md`, `structure.md`
- カスタムファイルもサポート（`/prompts:kiro-steering-custom` で管理）

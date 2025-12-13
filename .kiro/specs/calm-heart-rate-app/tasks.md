# Implementation Plan

- [x] 1. Expo基盤セットアップと依存追加
  - Expo Go/Dev Buildで動作確認しつつ、`expo-haptics` と `expo-sqlite` を追加し初期化コードを準備。
  - 画面構成のベース（Settings / Session / Logs）とナビゲーション（expo-router等）を用意し、Keep Awakeの仕組みを組み込む。
  - _Requirements: 2.1,2.5_

- [ ] 2. 設定機能の実装（視覚＋振動プレビュー） (P)
  - SettingsRepository/DAOでテンポ、バイブ強度・パターンを保存/取得する。
  - SettingsScreenでプリセット選択UIと強度/パターン選択UIを実装し、保存した値をロードして反映。
  - プレビューで視覚アニメと短い振動を同期再生し、次回起動時も設定を自動適用。
  - _Requirements: 1.1,1.2,1.3,1.4_

- [ ] 3. GuidanceEngineとHapticsAdapterの実装 (P)
  - GuidanceConfigに基づき呼吸テンポのステップタイマーを実装し、振動パターン生成と開始/停止を行う。
  - expo-haptics経由で振動を実行し、権限/設定エラーをResultで返却する。
  - 単一アクティブセッションの不変条件を維持し、進捗イベントをUI層に通知できる形にする。
  - _Requirements: 2.2,2.3,2.4_

- [ ] 4. セッション画面と視覚ガイド連携
  - SessionViewModel/Screenでモード選択（視覚呼吸ガイド／振動のみ）と開始/終了を実装。
  - BreathVisualGuideコンポーネントで円の拡大縮小などのアニメーションをテンポ同期で描画し、進捗を表示。
  - セッション時間満了や手動終了でガイド停止し、完了メッセージを表示。
  - _Requirements: 2.1,2.2,2.3,2.4,2.5_

- [ ] 5. セッション記録と履歴表示
  - SessionUseCaseで前後心拍の手入力、使用ガイド種別、体感評価、改善度を収集しSessionRepositoryへ保存。
  - 履歴一覧/詳細で開始前後心拍・ガイド種別・体感・改善度を確認できるUIを実装。
  - _Requirements: 3.1,3.2,3.3,3.4,3.5,3.6_

- [ ] 6. フォールバックとエラー処理
  - 振動が無効/失敗時は視覚ガイドのみ継続し、ユーザーに警告を表示する処理をSessionViewModelに組み込む。
  - 保存失敗時のリトライと失敗通知、入力バリデーションを追加する。
  - _Requirements: 2.3,3.1,3.2,3.6_

- [ ] 7. テスト
  - Unit: GuidanceEngineのパターン進行、HapticsAdapterの入力検証、SessionUseCaseの記録保存ロジック。
  - Integration: 設定保存→セッション開始→終了→履歴保存/表示のハッピーパス、振動不可時の視覚継続フォールバック。
  - _Requirements: 1.1,1.3,2.1,2.2,2.3,2.5,3.1,3.6_

# Implementation Plan

- [x] 1. 設定データモデルとリポジトリ更新 (P)
  - SettingsRepository/DAOをBPM(40-90), durationSec(60-300), pattern, intensity, useBreath, breathPresetに対応させ、既存SQLiteテーブルをマイグレーション。
  - 取得/保存の型を設計どおりに揃え、デフォルト値（例: bpm=60, duration=180）を定義。
  - _Requirements: 1.1,1.2,1.4,1.5,3.1_

- [x] 2. 設定画面とプレビュー強化 (P)
  - BPMスライダー/入力、セッション時間設定、パターン・強度選択、呼吸ON/OFFとプリセット選択をUIに実装し、保存・復元を反映。
  - プレビューで選択パターンに応じた複数振動を再生し視覚アニメも強調（Webは無振動フォールバックで落ちないこと）。
  - _Requirements: 1.1,1.2,1.3,1.5,3.1_

- [x] 3. GuidanceEngineのBPM進行と誤差補正
  - 60000/BPM間隔で振動パルスを生成し、タイマー遅延を次周期で補正して±5%以内を目標にする。
  - durationSecで時間停止を管理し、visualEnabledフラグで視覚同期通知を制御。HapticsAdapterのエラーをResultで返却。
  - _Requirements: 2.1,2.2,2.3,2.4_

- [ ] 4. セッション画面とモード選択連携
  - SessionViewModel/Screenでモード（振動/呼吸/併用）選択、開始/停止、状態表示、keep-awakeを実装。visualガイドは任意で同期表示。
  - durationSec経過または手動停止の早い方で確実に停止し、完了メッセージを表示。
  - _Requirements: 2.1,2.2,2.3,2.4,3.2,3.3_

- [ ] 5. セッション記録保存
  - SessionUseCaseで preHr/postHr、guideType（VIBRATION/BREATH/BOTH）、comfort、improvement、breathPreset/useBreath を収集しSessionRepositoryへ保存。
  - _Requirements: 4.1,4.2,4.3,4.4,4.5_

- [ ] 6. 履歴一覧・詳細表示
  - LogsViewModel/Screensで履歴を startedAt DESC で一覧表示し、詳細で心拍・ガイド種別・体感・改善度・presetを表示。
  - _Requirements: 4.6_

- [ ] 7. エラー/フォールバック処理
  - 振動不可（permission/disabled）時は視覚のみ継続し警告表示。BPM/duration/heart-rate入力をバリデーションし、保存失敗時はリトライ＋通知。
  - _Requirements: 2.2,2.3,4.1,4.2,4.3_

- [ ] 8. テスト
  - Unit: GuidanceEngineのBPM補正・停止、HapticsAdapter入力検証、SettingsRepositoryのduration/BPM/pattern保存、SessionUseCaseの記録保存。
  - Integration: 設定保存→モード別開始（振動/呼吸/併用）→時間/手動停止→記録保存→履歴表示、振動不可時の視覚継続フォールバック、Webプレビュー無振動動作。
  - _Requirements: 1.1,1.2,1.3,1.5,2.1,2.2,2.3,2.4,4.1,4.6_

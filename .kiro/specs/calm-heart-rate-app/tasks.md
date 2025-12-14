# Implementation Plan

- [x] 1. 設定データモデルとリポジトリ
  - BPM(40-90), durationSec(60-300), intensity, breathPresetを保存/取得できるようSchemaとDAOを整備し、既存データをマイグレーションする。
  - デフォルト値（BPM=60, duration=180, intensity=中, breathPreset=4-6-4）を返すフェイルセーフを実装する。
  - _Requirements: 1.1,1.2,1.4,1.5,3.1_

- [x] 2. セッション画面内の設定UIとプレビュー
  - 設定セクションをセッション画面に常設し、BPM/時間/強度/呼吸プリセットを編集・保存・復元できるようにする。
  - 「プレビュー」で1拍1振動を再生し（Webは無振動でもエラーなし）、視覚アニメで強調する。
  - _Requirements: 1.1,1.2,1.3,1.5,3.1_

- [x] 3. ガイドモード選択と開始/停止フロー
  - デフォルトmode=BOTHで「開始」押下時に設定値を適用し、振動/呼吸/併用の各モードを選択可能にする。
  - durationSec経過または手動停止の早い方で確実に終了し、終了メッセージを表示する。
  - _Requirements: 2.1,2.4,3.2,3.3_

- [x] 4. GuidanceEngineの周期精度とフォールバック
  - 60000/BPM間隔の単発振動で±5%以内を目標にタイマー補正を実装する。
  - 振動不可（permission/disabled等）の場合は視覚ガイドのみ継続し、エラーをUIへ通知する。
  - _Requirements: 2.1,2.2,2.3_

- [ ] 5. セッション記録保存
  - preHr/postHr、guideType、comfort、improvement、breathPresetをSessionRepositoryに保存する完了処理を実装する。
  - _Requirements: 4.1,4.2,4.3,4.4,4.5_

- [ ] 6. 履歴一覧・詳細表示
  - startedAt DESCで履歴一覧を表示し、詳細で心拍・ガイド種別・体感・改善度・presetを確認できる画面を実装する。
  - _Requirements: 4.6_

- [ ] 7. バリデーションとエラー処理
  - BPM/時間入力、心拍入力をバリデーションし、保存失敗時はリトライとユーザー通知を行う。
  - _Requirements: 2.2,2.3,4.1,4.2,4.3_

- [ ] 8. テスト
  - Unit: GuidanceEngine周期補正と停止、HapticsAdapter入力検証、SettingsRepository保存/復元、SessionUseCase開始/停止/記録保存。
  - Integration: 設定保存→モード別開始（振動/呼吸/併用）→時間/手動停止→記録保存→履歴表示、振動不可時の視覚継続、Webプレビュー無振動で落ちないこと。
  - _Requirements: 1.1,1.2,1.3,1.5,2.1,2.2,2.3,2.4,4.1,4.6_

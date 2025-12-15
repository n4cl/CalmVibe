# Implementation Plan

- [ ] 1. 設定永続化とデフォルト復元
- [x] 1.1 SQLiteスキーマとメモリフォールバック
  - settingsテーブルを設計準拠のBreathPattern構造（bpm, durationSec[60-300|null], intensity, breath.type/inhale/hold/exhale/cycles）で初期化し、Web/テスト時のメモリ実装も整備する。
  - _Requirements: 1.1,1.2,1.4,1.5,3.1_
- [ ] 1.2 SettingsRepository実装とデフォルト適用
  - 保存/取得で値域を検証しつつデフォルトを返すフェイルセーフを備える（bpm40-90, duration60-300|null, cycles null=∞）。
  - _Requirements: 1.1,1.2,1.4,1.5,3.1_

- [ ] 2. セッション設定UI＆プレビュー（振動/呼吸分離）
- [ ] 2.1 振動設定UI（BPM/時間/強度）と自動復元
  - セッション画面に常設し、編集→保存→再訪で値が反映されることを確認する。
  - _Requirements: 1.1,1.2,1.4,1.5_
- [ ] 2.2 呼吸設定UI（吸・止・吐・cycles）とプリセットショートカット
  - BreathPatternを直接編集でき、プリセットボタンで即時適用できるようにする。振動設定と独立して保持。
  - _Requirements: 3.1,3.3_
- [ ] 2.3 モード連動プレビュー
  - 振動モード: 1拍1振動を現在のBPM/強度で再生（Webは無振動でエラーなし）。呼吸モード: 吸/止/吐に同期した円アニメとフェーズ開始単発振動を再生。モード切替でプレビュー対象が自動で切替。
  - _Requirements: 1.3,2.3,2.5_

- [ ] 3. ガイダンスエンジン＆ハプティクス
- [ ] 3.1 振動ガイド（±5%補正）
  - 60000/bpm間隔で単発振動を出し、タイマードリフトを補正して±5%以内を目標とする。active管理と重複開始防止。
  - _Requirements: 2.1,2.2,2.4_
- [ ] 3.2 呼吸ガイド進行
  - BreathPattern（2/3フェーズ, cycles null=∞）に従いフェーズ経過を通知し、各フェーズ開始で単発振動を出しつつ、duration上限またはcycles完了で終了する。視覚ガイド用ステップイベントを発火。
  - _Requirements: 2.1,2.3,2.5,3.2,3.3_
- [ ] 3.3 ハプティクスアダプタ
  - 振動不可（permission/disabled等）をResultで通知し、上位で視覚のみ継続できるようにする。
  - _Requirements: 1.3,2.2_

- [ ] 4. セッション開始・停止・完了フロー
- [ ] 4.1 Start/Stop処理
  - 設定読込→Guidance開始、duration/手動停止の早い方で停止し状態を更新する。
  - _Requirements: 2.1,2.4,3.2,3.3_
- [ ] 4.2 完了入力モーダルとSessionUseCase.complete
  - 停止後にpre/post心拍、comfort、improvement、guideType、breath/BPMを入力させ、UseCaseで検証して保存要求を発行する。
  - _Requirements: 4.1,4.2,4.3,4.4,4.5_
- [ ] 4.3 SessionRepositoryで記録保存
  - session_recordsへ開始/終了時刻、ガイド種別、心拍、主観評価、breath/BPMを保存する。
  - _Requirements: 4.1,4.2,4.3,4.4,4.5_

- [ ] 5. 履歴一覧・詳細表示
- [ ] 5.1 履歴一覧（startedAt DESC）
  - 各セッションの開始/終了心拍・ガイド種別・主観評価・改善度・breath/BPMを表示する。
  - _Requirements: 4.6_
- [ ] 5.2 履歴詳細
  - 1件の記録を詳細表示し、保存内容がすべて閲覧できるようにする。
  - _Requirements: 4.6_

- [ ] 6. バリデーションとエラーハンドリング
- [ ] 6.1 入力バリデーション
  - BPM/時間/心拍/comfort/improvement/cyclesの範囲チェックとエラーメッセージ表示。送信ブロックを実装。
  - _Requirements: 1.1,1.5,2.2,4.1,4.2,4.3_
- [ ] 6.2 ハプティクス・DB失敗時のフォールバック
  - 振動不可時は視覚のみ継続（振動/呼吸両モード）、保存失敗時はリトライとユーザー通知を行う。
  - _Requirements: 1.3,2.2,2.5,4.3_

- [ ] 7. テスト
- [ ] 7.1 Unitテスト
  - GuidanceEngine（振動補正、呼吸フェーズ進行、終了条件）、SettingsRepository保存/復元、SessionUseCase開始/停止/完了をカバー。
  - _Requirements: 1,2,3,4_
- [ ] 7.2 Integration/UIテスト
  - 設定編集→保存→モード別プレビュー→開始/停止→完了入力→履歴表示の一連を通す。Webで振動なしでもエラーにならないことを確認。
  - _Requirements: 1,2,3,4_

# CalmVibe — 開発メモ（2025-12 時点）

## 主要機能
- セッション画面で振動ガイド／呼吸ガイドを即時開始・停止。
- 呼吸ガイドは吸・止・吐のフェーズ時間に合わせて円アニメが連続再生。
- 設定は SQLite 永続化（Web/テストはメモリフォールバック）。
- 振動: Expo Haptics + Androidは `Vibration` 併用で確実に鳴動（強度UIは非表示）。

## セットアップ
- 依存インストール: `npm install`
- 使用パッケージ: expo-haptics / expo-sqlite / expo-keep-awake / expo-router / @testing-library/react-native

## 実行
- 開発サーバー: `npm run start`
- Android 実機: `npm run android`
- Web: `npm run web`
- Lint: `npm run lint`
- テスト: `npm test -- --runInBand`

## 画面構成（現在）
- session: セッション開始・停止、視覚呼吸ガイド、振動ガイド
- logs: 履歴（未実装タスク 5.x）
- settings: 独立画面は未分離。セッション内で設定編集・保存を実施。

## 実装メモ
- ハプティクス強度はハード依存のため UI からは非表示。今は固定パターンで鳴動。
- 呼吸アニメ: 最小スケールから開始し、吸で最大、吐で最小まで変化。
- SessionUseCase は GuidanceEngine を介して設定値を反映し、onComplete/onStopで状態リセット。

## 開発時の注意
- Expo Go / Dev Build 前提。バックグラウンド常駐は未対応（画面ON想定）。
- Jest＋@testing-library/react-native で単体/UI テスト。`jest.setup.js` に Expo 用ポリフィルを設定。

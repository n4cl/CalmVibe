# CalmVibe (Android) — 開発手順メモ

## セットアップ
- 依存インストール: `npm install`
- 必要パッケージは既に追加済み: expo-haptics / expo-sqlite / expo-keep-awake / expo-router

## 実行
- 開発サーバー: `npm run start`
- Android実機/エミュ: `npm run android`
- Webプレビュー: `npm run web`
- Lint: `npm run lint`
- テスト: `npm test -- --runInBand`

## 画面構成（暫定）
- settings: 設定画面（テンポ・バイブ強度/パターンの保存・プレビュー）
- session: セッション開始/終了、視覚呼吸ガイド＋振動
- logs: セッション履歴の閲覧

## 備考
- Expo Go / Development Build 前提。バックグラウンド常駐は未対応（画面ON前提）。
- Jest＋@testing-library/react-nativeでテスト。`jest.setup.js` で Expo の Jest 実行環境向けワークアラウンド（import meta registry / structuredClone）を設定。

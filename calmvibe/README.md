# CalmVibe 開発用 README

開発者向けのセットアップ・運用メモです。アプリ概要はリポジトリルートの `README.md` を参照してください。

## セットアップ
```bash
cd calmvibe
npm install
```

## 開発・実行
- 開発サーバー: `npm run start`
- Android 実機: `npm run android`
- Web: `npm run web`
- Lint: `npm run lint`
- テスト: `npm test -- --runInBand`
- Webビルド確認: `npx expo export -p web`
※ スタンドアロンAPKの導入手順は、ルートの `README.md` を参照してください。

## 技術スタック
- Expo (React Native) / TypeScript
- expo-router（タブ: session / logs）
- expo-haptics（Android は Vibration 併用、強度UIなし）
- expo-sqlite（Web/テストはメモリフォールバック）
- @testing-library/react-native + Jest

## 仕様ドキュメント
- `.kiro/specs/calm-heart-rate-app/requirements.md`
- `.kiro/specs/calm-heart-rate-app/design.md`
- `.kiro/specs/calm-heart-rate-app/tasks.md`

## 実装メモ
- 心拍ガイド: 実行中にBPM変更を即時反映（GuidanceEngine.updateVibrationBpm）
- 呼吸ガイド: 最小スケールから吸→最大、吐→最小のアニメ。同フェーズ開始で単発振動。
- 設定は SQLite に保存。Web/テストはメモリ実装。

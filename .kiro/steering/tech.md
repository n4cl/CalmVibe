# 技術スタック

## アーキテクチャ
- Expo/React Native を中心に、UI（app/components）とドメインロジック（src）を分離
- ViewModel + UseCase + Repository を採用し、UIからビジネスロジックを切り離す

## コア技術
- **言語**: TypeScript（`strict` 有効）
- **フレームワーク**: Expo (React Native)
- **ルーティング**: expo-router（ファイルベース、タブ構成）

## 主要ライブラリ
- expo-haptics（振動）
- expo-sqlite（ローカル永続化、Webはメモリフォールバック）
- expo-keep-awake（セッション中のスリープ防止）
- Jest + @testing-library/react-native（テスト）

## 開発標準

### 型安全性
- TypeScript strict を前提に、暗黙の any を避ける

### コード品質
- ESLint（`npm run lint`）を基準とする

### テスト
- ロジック中心のユニットテストを基盤にする
- テストは `__tests__` 配下に配置する

## 開発環境

### 必須ツール
- Node.js 24.x / npm
- Expo CLI（`expo start` を実行できること）

### よく使うコマンド
```bash
# Dev
npm run start
# Android
npm run android
# Web
npm run web
# Lint
npm run lint
# Test
npm test
```

## 重要な技術的判断
- ルーティングは expo-router のファイル構成に従う
- プラットフォーム差異は `.web.ts` / `.native` などの suffix で吸収する
- 振動が利用できない環境でもガイドは継続し、失敗は致命エラーにしない

## 更新履歴
- 2025-12-22: Node.js バージョンを 24.x に固定（Issue #6）

---
_標準とパターンを示し、依存一覧の網羅は避ける_

# リサーチと設計判断

---
**目的**: 設計判断の根拠となる調査結果とトレードオフを記録する。
---

## Summary
- **Feature**: android-standalone-apk
- **Discovery Scope**: Extension
- **Key Findings**:
  - EAS Build は `eas.json` のビルドプロファイルで `.apk` 生成を指定でき、内部配布用途ではAPKが推奨されている。
  - EAS Build の設定は `eas.json` に集約され、初回の `eas build:configure` で生成される。
  - Android のパッケージIDは `app.json` の `android.package` で指定し、スタンドアロンアプリの識別子として必須。
  - DB互換性の判定は SQLite の `PRAGMA user_version` を使うとシンプルに管理できる。

## Research Log

### EAS BuildでAPKを生成する方法
- **Context**: Expo Go不要のAPK生成（要件 1.1 / 1.2 / 1.3）を満たすためのビルド方式確認。
- **Sources Consulted**: 
  - https://docs.expo.dev/build/eas-json/
  - https://docs.expo.dev/eas/json/
- **Findings**:
  - `eas.json` の build profile に `android.buildType: "apk"` を指定すると `.apk` を生成できる。
  - `distribution: "internal"` はプレビュー用途に適し、APKが推奨される。
- **Implications**: APK生成は build profile で制御し、個人配布向けのプロファイルを用意する。

### EAS Build設定ファイルの生成と運用
- **Context**: 新規に `eas.json` を追加する際の標準手順確認。
- **Sources Consulted**:
  - https://docs.expo.dev/build-reference/build-configuration/
- **Findings**:
  - `eas build:configure` 実行時に `eas.json` が生成される。
- **Implications**: `eas.json` をリポジトリに追加し、ビルド手順に明記する。

### AndroidパッケージID要件
- **Context**: 上書きインストールを可能にする識別子の要件確認（要件 2.1〜2.3）。
- **Sources Consulted**:
  - https://docs.expo.dev/versions/v51.0.0/config/app/
  - https://docs.expo.dev/build-reference/variants/
- **Findings**:
  - AndroidのパッケージIDは `android.package` で指定する。
  - 同一パッケージIDであれば同一アプリとして扱われる。
- **Implications**: `app.json` に固定の `android.package` を設定し、上書き更新可能な状態を維持する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| EAS Build (APK) | EAS BuildでAPKを生成し手動インストール | 端末に直接導入可能、Expo Go不要 | ストア公開には不適 | 個人利用向けに適合 |
| ローカルGradleビルド | ネイティブプロジェクトを生成してGradleでAPK作成 | 完全ローカルで完結 | 設定/保守コスト増 | 本スコープ外 |

## Design Decisions

### Decision: EAS Buildのプレビュー用APKプロファイルを採用
- **Context**: Expo Go不要のAPKを生成し、個人端末へ配布する必要がある。
- **Alternatives Considered**:
  1. EAS BuildでAPKを生成
  2. ローカルGradleビルド
- **Selected Approach**: `eas.json` にプレビュー用プロファイルを作成し、`android.buildType: "apk"` と `distribution: "internal"` を指定する。
- **Rationale**: 現行のExpo管理ワークフローに一致し、ビルド手順の再現性が高い。
- **Trade-offs**: ビルドはEASに依存するため、完全オフラインでは実行できない。
- **Follow-up**: 初回のEASセットアップ（プロジェクトID/認証）をドキュメント化する。

### Decision: DB互換性が破綻した場合は初期化で対応
- **Context**: 頻繁な更新によりスキーマ互換性が崩れる可能性がある。
- **Alternatives Considered**:
  1. マイグレーションを実装してデータを維持
  2. 不整合時はDBを初期化して空状態に戻す
- **Selected Approach**: 起動時に `PRAGMA user_version` を確認し、非互換時はローカルDBを初期化する。
- **Rationale**: 個人利用の範囲で実装コストを抑え、更新サイクルを阻害しない。
- **Trade-offs**: 互換性がない更新では履歴データが失われる。
- **Follow-up**: 重要データの保持が必要になった場合は別要件でマイグレーションを検討する。

## Risks & Mitigations
- パッケージID変更により別アプリ扱いになる — `android.package` を固定し、変更時は明示的に告知する。
- DB初期化により履歴が消える — ドキュメントに注意点を記載し、必要ならバックアップ案を検討する。
- EAS認証や資格情報の未設定でビルド失敗 — セットアップ手順をREADMEに記載する。

## References
- https://docs.expo.dev/build/eas-json/
- https://docs.expo.dev/eas/json/
- https://docs.expo.dev/build-reference/build-configuration/
- https://docs.expo.dev/versions/v51.0.0/config/app/
- https://docs.expo.dev/build-reference/variants/

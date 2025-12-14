# Design Document

## Overview
本機能は不安や動揺で鼓動が高まったときに、ユーザーが指定したBPMリズムで「1拍1振動」を即時開始し、呼吸ペースを整えて落ち着きを取り戻すことを主目的とする。視覚ガイド（円の鼓動アニメ）と呼吸テンポプリセットは振動とは独立した補助機能として扱い、画面を見られない状況でも振動だけで吸気/呼気切り替えが分かる。心拍は手入力のみで記録し、履歴を端末ローカルに保存・参照する。

### Goals
- 振動リズム（BPM）を設定・保存し、±5%以内の間隔で「1拍1振動」を提供する。
- ワンタップで呼吸ペースガイドを開始/停止し、振動モードまたは呼吸ガイド（視覚）モードのいずれかでフェーズ提示できる。
- セッション前後の心拍・主観評価・ガイド種別をローカルに記録・閲覧できる。

### Non-Goals
- 自動心拍計測や外部デバイス連携。
- 長時間バックグラウンド実行（Expo Go / Development Build では非対応）。画面ON/前面前提。
- クラウド同期・共有。

## Architecture

### Architecture Pattern & Boundary Map
選択パターン: MVVM + UseCase + Repository。UIはReact Native (Expo)、ドメインはGuidanceEngine/UseCase、データはSQLite、プラットフォームAPI差異はHapticsAdapterで隔離。

```mermaid
graph TB
  UI[RN Screens/Components] --> VM[ViewModels]
  VM --> UC[SessionUseCase]
  VM --> SettingsRepo
  UC --> GE[GuidanceEngine]
  UC --> SessionRepo
  GE --> HapticsAdapter
  SettingsRepo --> SQLite[(expo-sqlite)]
  SessionRepo --> SQLite
```

### Technology Stack
| Layer | Choice / Version | Role | Notes |
|-------|------------------|------|-------|
| Frontend | React Native + Expo (Go/Dev Build), TypeScript | 画面・アニメ・入力 | expo-router, Animated |
| Domain | TypeScript | GuidanceEngine, SessionUseCase | タイマー補正で±5%を目標 |
| Data | expo-sqlite | 設定・履歴永続化 | Webはメモリフォールバック |
| Platform | expo-haptics | 振動実行 | Webはダミー |
| Infra | expo-keep-awake | スリープ防止 | 画面ON前提 |

## System Flows

### セッション開始〜停止（呼吸ペースガイド）
```mermaid
sequenceDiagram
  participant User
  participant UI as SessionScreen
  participant VM as SessionVM
  participant UC as SessionUseCase
  participant GE as GuidanceEngine
  participant HA as HapticsAdapter

  User->>UI: 開始タップ
  UI->>VM: start()
  VM->>UC: beginSession(config from settings section on the same screen, default mode=VIBRATION)
  UC->>GE: startGuidance(BPM, pattern)
  GE->>HA: playPattern(loop)
  GE-->>VM: onStep(cycle, elapsed)
  alt 完了/停止
    VM->>UC: stopSession()
    UC->>GE: stopGuidance()
    GE->>HA: stop()
    VM-->>UI: 状態更新（完了/停止）
  end
```

## Requirements Traceability
| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | BPM入力/スライダー保存（セッション画面内設定） | SessionScreen/VM | SettingsRepository | - |
| 1.2 | 強度保存（セッション画面内設定） | SessionScreen/VM | SettingsRepository | - |
| 1.3 | プレビューで単発振動を確認 | SessionScreen/VM | HapticsAdapter | - |
| 1.4 | 次回自動適用 | SessionVM | SettingsRepository | - |
| 1.5 | セッション時間設定＋手動停止 | SessionScreen/VM | SettingsRepository | - |
| 2.1 | 呼吸ペース即時開始（デフォルト振動、呼吸モードに切替可） | SessionScreen/VM, SessionUseCase | SessionUseCase | セッション開始 |
| 2.2 | BPM±5%で単発振動（吸気/呼気の切替キュー） | GuidanceEngine, HapticsAdapter | GuidanceEngine.startGuidance | セッション進行 |
| 2.3 | 視覚ガイド同期・任意OFF（画面を見なくても振動で続行） | BreathVisualGuide, SessionVM | - | セッション進行 |
| 2.4 | 確実停止と終了表示（時間/手動） | SessionUseCase, GuidanceEngine | GuidanceEngine.stopGuidance | セッション完了 |
| 3.1 | 呼吸プリセット保存（セッション画面内設定） | SessionScreen/VM | SettingsRepository | - |
| 3.2 | 呼吸のみの開始 | SessionUseCase, GuidanceEngine | SessionUseCase | セッション開始 |
| 3.3 | 振動のみの開始 | SessionUseCase | SessionUseCase | セッション開始 |
| 4.1-4.6 | 記録・履歴表示 | SessionUseCase, SessionRepo, LogsScreen/VM | SessionRepository | 記録保存/閲覧 |

## Components & Interfaces

| Component | Layer | Intent | Req | Dependencies | Contracts |
|-----------|-------|--------|-----|--------------|-----------|
| SettingsRepository | Data | BPM/強度/呼吸テンポ/セッション時間の保存/取得（セッション画面内設定セクションで使用） | 1.1-1.5,3.1 | expo-sqlite (P0) | Service, State |
| SessionRepository | Data | セッション記録の保存/取得 | 4.1-4.6 | expo-sqlite (P0) | Service, State |
| HapticsAdapter | Platform | 振動実行と停止、失敗理由の通知 | 1.3,2.2 | expo-haptics (P0) | Service |
| GuidanceEngine | Domain | BPMベースのパルス生成・進行管理 | 2.1-2.4 | HapticsAdapter (P0) | Service |
| SessionUseCase | Domain | 開始/停止オーケストレーション、ガイド選択 | 2.1-2.4,3.2,3.3,4.1-4.3 | GuidanceEngine, SessionRepository, SettingsRepository (P0) | Service |
| SessionViewModel | Presentation | セッション画面内で設定CRUD/プレビュー＋開始/停止/進行表示 | 1.1-1.5,2.1-2.4,3.1-3.3 | SettingsRepository, HapticsAdapter, SessionUseCase (P0) | State |
| BreathVisualGuide | Presentation | 振動/呼吸周期に同期した円アニメ | 2.3,3.2 | SessionViewModel (P1) | State |
| LogsViewModel | Presentation | 履歴一覧/詳細取得 | 4.6 | SessionRepository (P0) | State |

### SettingsRepository (Data)
| Field | Detail |
|-------|--------|
| Intent | 振動BPM/強度/呼吸テンポ/セッション時間の保存と取得 |
| Requirements | 1.1,1.2,1.4,1.5,3.1 |
| Contracts | Service, State |
| Outbound | expo-sqlite (P0) |

**Service Interface**
```ts
interface SettingsValues {
  bpm: number; // 40-90 （セッション画面内で編集・保存するデフォルト値）
  durationSec: number; // 60-300, 手動停止は常に可（同上）
  intensity: 'low'|'medium'|'strong';
  breathPreset: '4-6-4'|'5-5-5'|'4-4-4';
}
interface SettingsRepository {
  get(): Promise<SettingsValues>;
  save(values: SettingsValues): Promise<void>;
}
```

### HapticsAdapter (Platform)
| Field | Detail |
|-------|--------|
| Intent | 振動パターン実行・停止、失敗理由の通知 |
| Requirements | 1.3,2.2 |
| Contracts | Service |

**Service Interface**
```ts
type HapticsResult = { ok: true } | { ok: false; error: 'permission'|'disabled'|'unknown' };
interface HapticsAdapter {
  play(pattern: number[], amplitudes?: number[]): Promise<HapticsResult>;
  stop(): Promise<HapticsResult>;
}
```
- Validation: pattern長とamplitudes長一致。呼吸のみモードでは空配列を許容し、その場合は振動を送出しない。
- Fallback: 失敗時はエラーを返し、上位で視覚のみ継続。

### GuidanceEngine (Domain)
| Field | Detail |
|-------|--------|
| Intent | BPM間隔で単発振動を継続し、視覚同期用ステップを通知 |
| Requirements | 2.1,2.2,2.3,2.4 |
| Contracts | Service |

**Service Interface**
```ts
interface GuidanceConfig {
  bpm: number; // 40-90
  pattern: number[]; // ms配列（通常は [0] の単発。呼吸のみモードでは空配列）
  durationSec: number; // settings.durationSec を使用（初期値180）
  visualEnabled: boolean;
  breathPreset?: '4-6-4'|'5-5-5'|'4-4-4';
}
interface GuidanceListener {
  onStep?: (cycle: number, elapsedSec: number) => void;
  onComplete?: () => void;
  onStop?: () => void;
}
interface GuidanceEngine {
  start(config: GuidanceConfig, listener?: GuidanceListener): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<void>;
  isActive(): boolean;
}
```
- Behavior: 60000/bpm でタイマー設定、遅延は次周期で補正。±5%目標。
- Invariants: 単一アクティブ、停止時にタイマー全解除。
- Timing note: `setInterval`遅延を計測し、次周期の予定時刻からドリフト分を差し引いてスケジュールする簡易補正を行う。

### SessionUseCase (Domain)
| Field | Detail |
|-------|--------|
| Intent | 設定読込→Guidance開始/停止、終了時の記録保存（振動と呼吸をモードで切替） |
| Requirements | 2.1-2.4,3.2,3.3,4.1-4.3 |
| Contracts | Service |

**Service Interface**
```ts
interface StartInput { mode: 'VIBRATION'|'BREATH'; }
interface CompleteInput {
  preHr?: number;
  postHr?: number;
  guideType: 'VIBRATION'|'BREATH';
  comfort?: number;
  improvement?: number;
}
interface SessionUseCase {
  start(input: StartInput): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<void>;
  complete(input: CompleteInput): Promise<void>;
}
```
- Behavior: startでSettingsを取得しGuidanceEngineを起動。デフォルトmodeは VIBRATION。BREATHなら視覚のみ・振動OFF。durationSecは設定値（初期値180秒）を使用し、ユーザー操作でいつでも停止可能。呼吸ガイドは機能として常に利用可能で、モード選択で使わないことを選べるだけ。
- Stop条件: durationSec経過またはユーザー手動停止の早い方。停止時はGuidanceEngine.stop()を呼び、状態を終了に更新。
- On complete: guideTypeを含む記録（preHr/postHr/comfort/improvement/breathPreset）をSessionRepositoryへ保存。

### SessionRepository (Data)
| Field | Detail |
|-------|--------|
| Intent | セッション記録の保存/取得 |
| Requirements | 4.1-4.6 |
| Contracts | Service, State |

**Data Model (Logical / SQLite)**
- `session_records`(id PK, startedAt, endedAt, bpm INT, guideType TEXT, preHr INT?, postHr INT?, comfort INT?, improvement INT?, breathPreset TEXT?, notes TEXT?)
- Index: startedAt DESC

### ViewModels / UI
- **SessionViewModel/Screen**: セッション画面内で設定変更（BPM/時間/強度/呼吸プリセット）とプレビュー、モード選択（振動/呼吸）、開始/停止、状態表示、視覚ガイド切替（Req 1.1-1.5,2.1-2.4,3.1-3.3）。
- **BreathVisualGuide**: 振動/呼吸周期に同期した円アニメ（Req 2.3）。
- **LogsViewModel/Screens**: 履歴一覧/詳細（Req 4.1-4.6）。

## Data Models

### Domain Model
- `GuidanceSettings`: bpm, intensity, durationSec, breathPreset。
- `SessionRecord`: id, startedAt, endedAt, bpm, guideType, preHr?, postHr?, comfort?, improvement?, breathPreset?, notes?.

### Logical Data Model
- テーブル: `settings`(id=1, bpm INT, intensity TEXT, durationSec INT, breathPreset TEXT, updatedAt TEXT)
- テーブル: `session_records`(上記定義)
- 一貫性: 単一設定行をupsert。セッション保存はトランザクションで1件単位。

## Error Handling
- 振動不可（permission/disabled）: GuidanceEngineがエラーを返し、UIは視覚ガイドのみ継続＋警告表示。
- タイマー遅延: GuidanceEngineが補正するが±5%超は警告ログ。
- DB失敗: リトライ1回、失敗時はユーザーへ保存不可を通知（セッション完了は維持）。

## Testing Strategy
- Unit: GuidanceEngineのBPM間隔補正と停止、HapticsAdapterの入力検証、SettingsRepository upsert、SessionUseCase開始/停止/記録保存。
- Integration: 設定保存→セッション開始（振動のみ/呼吸のみ/併用）→停止→記録保存→履歴表示。
- UI: Settingsプレビューで単発振動、Session開始/停止の状態遷移、履歴一覧表示。

## Performance & Scalability
- タイマー精度: ±5%以内を目標。セッション長は数分以内を推奨し、UIで上限を設定。
- DB規模: 端末ローカルのみ、インデックスは startedAt DESC のみで十分。

## Security Considerations
- データは端末ローカルのみ保存。ネットワーク送信なし。
- 入力心拍は任意、個人識別情報は保持しない。

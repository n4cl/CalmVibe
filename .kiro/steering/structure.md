# プロジェクト構成

## 組織方針
- ルーティング/UI とドメインロジックを分離する
- UI は `app/` と `components/`、ドメインは `src/` に集約する

## ディレクトリパターン

### ルーティング（expo-router）
**場所**: `calmvibe/app/`  
**目的**: 画面・タブ構成の定義（ファイルベース）  
**例**: `calmvibe/app/session.tsx`, `calmvibe/app/logs.tsx`

### ドメイン/ロジック
**場所**: `calmvibe/src/`  
**目的**: UseCase/Repository/エンジンなどの純粋ロジック  
**例**: `calmvibe/src/session/useCase.ts`, `calmvibe/src/guidance/guidanceEngine.ts`

### UI コンポーネント
**場所**: `calmvibe/components/`  
**目的**: 再利用可能なUI部品  
**例**: `calmvibe/components/themed-text.tsx`, `calmvibe/components/ui/collapsible.tsx`

## 命名規則
- **ルート/画面**: `kebab-case`（例: `logs.tsx`）
- **UIコンポーネントファイル**: `kebab-case`
- **ドメインロジック**: `lowerCamelCase`（例: `sessionViewModel.ts`）
- **テスト**: `__tests__` 配下に `*.test.ts(x)`

## import の方針
```typescript
import { GuidanceEngine } from '@/src/guidance' // 絶対パス
import { SessionUseCase } from '../session/useCase' // 相対パス
```

**パスエイリアス**:
- `@/` は `calmvibe/` 配下を指す

## コード組織の原則
- UI は状態管理/オーケストレーションを ViewModel に委譲する
- 永続化は Repository で抽象化し、UIから直接アクセスしない
- プラットフォーム差異はファイル suffix で分離する

---
_構造パターンを示し、ディレクトリ一覧の網羅は避ける_

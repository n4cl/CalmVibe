# Requirements Document

## Introduction
心拍を落ち着かせるためのスマホアプリMVPとして、ユーザーの心拍を計測・可視化し、ガイド付き呼吸などで短時間に落ち着ける体験を提供する。

## Requirements

### Requirement 1: セッション開始と個人設定
**Objective:** 心拍が高ぶりやすいユーザーとして、短時間で落ち着くためのセッションをすぐ始めたい。なぜなら、不安が高まった瞬間に対処したいから。

#### Acceptance Criteria
1. When 初回起動時, the Calm Heart Rate App shall プライバシーポリシーと同意画面を表示してユーザー同意を取得する。
2. When ユーザーがセッションを開始するとき, the Calm Heart Rate App shall 目標状態（落ち着きたい度合い）とセッション時間を選択させる。
3. If ユーザーが健康上の警告に同意しない場合, the Calm Heart Rate App shall セッション開始をブロックし理由を説明する。
4. The Calm Heart Rate App shall セッション開始前に現在の気分/緊張度を1〜5で入力させ記録する。

### Requirement 2: 心拍取得と可視化
**Objective:** ユーザーとして、自分の心拍変化を見える化したい。なぜなら、セッション効果を把握したいから。

#### Acceptance Criteria
1. When セッション中に対応デバイスの心拍データが取得可能なとき, the Calm Heart Rate App shall 5秒以内に最新心拍数を表示する。
2. While センサー接続が切断された状態, the Calm Heart Rate App shall 画面上に切断ステータスを表示し再接続操作を案内する。
3. If 心拍データの取得が連続30秒失敗した場合, the Calm Heart Rate App shall データ取得失敗を通知し手動入力オプションを提示する。
4. When ユーザーが手動で心拍を入力するとき, the Calm Heart Rate App shall 入力値をタイムスタンプ付きで保存しリアルタイムグラフに反映する。
5. The Calm Heart Rate App shall セッション中の心拍トレンドをリアルタイム折れ線グラフで表示し直近1分の履歴を保持する。

### Requirement 3: 呼吸・リラクゼーションガイド
**Objective:** ユーザーとして、ガイド付き呼吸で心拍を落ち着かせたい。なぜなら、短時間で効果を得たいから。

#### Acceptance Criteria
1. When セッション開始時, the Calm Heart Rate App shall 呼吸ペース（例: 4-6-4秒）を視覚と音で提示する。
2. While セッション進行中, the Calm Heart Rate App shall 心拍が低下したタイミングでポジティブフィードバックを表示する。
3. If ユーザーが過呼吸やめまいを申告した場合, the Calm Heart Rate App shall セッションを一時停止し休息手順を案内する。
4. When セッション時間が終了するとき, the Calm Heart Rate App shall セッションを自動終了し結果サマリ（平均心拍・開始/終了心拍・気分変化）を表示する。
5. The Calm Heart Rate App shall ユーザーが選択したBGMまたは環境音をセッション全体で再生できる設定を提供する。

### Requirement 4: 通知とフォローアップ
**Objective:** ユーザーとして、適切なタイミングでリマインドを受けたい。なぜなら、リラクゼーションを習慣化したいから。

#### Acceptance Criteria
1. When ユーザーがリマインダー時刻を設定するとき, the Calm Heart Rate App shall ローカル通知をスケジュールする。
2. If 連続3日セッション未実施の場合, the Calm Heart Rate App shall 1日1回まで「再開を促す」通知を送信する。
3. When セッション完了後, the Calm Heart Rate App shall 当日の心拍変化と気分スコアの比較サマリを表示する。
4. Where 通知がミュートモードのデバイスである, the Calm Heart Rate App shall 無音バナー通知でリマインドを提示する。

### Requirement 5: プライバシーとデータ保護
**Objective:** プライバシーを重視するユーザーとして、データの扱いを制御したい。なぜなら、安心して利用したいから。

#### Acceptance Criteria
1. When ユーザーがデータ共有設定を開くとき, the Calm Heart Rate App shall 心拍データの保存範囲（ローカルのみ/クラウド）を選択させる。
2. If ユーザーがデータ削除を要求した場合, the Calm Heart Rate App shall 指定されたセッション記録を即時削除し確認メッセージを表示する。
3. While オフライン状態, the Calm Heart Rate App shall ローカル暗号化ストレージにデータを保存しオンライン復帰時まで同期を保留する。
4. The Calm Heart Rate App shall 収集データの利用目的を初回同意画面と設定画面の双方に表示する。
5. If 年齢がアプリの想定利用年齢未満に設定された場合, the Calm Heart Rate App shall アカウント作成を拒否し保護者向け案内を表示する。

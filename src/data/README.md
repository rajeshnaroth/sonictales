# 作品データ管理ガイド

このファイルは、ポートフォリオサイトの作品データを管理する方法を説明しています。

## 作品の追加・編集方法

### 1. 作品データファイル
`/data/works.ts` ファイルで全ての作品データを管理しています。

### 2. 新しい作品を追加する手順

1. `/data/works.ts` ファイルを開く
2. `works` 配列の最後に新しい作品オブジェクトを追加
3. 以下の情報を入力：

```typescript
{
  id: '次の番号',                    // 例: '7'
  title: '作品タイトル',
  category: 'カテゴリー',            // 'MV', 'Commercial', 'Short Film', 'Documentary'
  year: 2024,                       // 制作年
  artist: 'アーティスト名',          // MVの場合のみ
  client: 'クライアント名',          // Commercialの場合のみ
  duration: '3:30',                 // 動画の長さ
  thumbnail: 'サムネイル画像URL',
  videoUrl: '動画URL',
  description: '作品の説明文',
  credits: {
    director: 'Rajesh Naroth',
    editor: 'Rajesh Naroth',
    cinematographer: '撮影監督名',   // オプション
    producer: 'SonicTales'           // オプション
  }
}
```

### 3. 画像の取得方法

**サムネイル画像:**
- [Unsplash](https://unsplash.com) から適切な画像を選択
- URLの最後に `?w=800&h=600&fit=crop` を追加して最適化

**例:**
```
https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=600&fit=crop
```

### 4. 動画URLについて

以下の形式に対応しています：
- YouTube: `https://www.youtube.com/watch?v=VIDEO_ID`
- Vimeo: `https://vimeo.com/VIDEO_ID`
- 直接動画ファイル: `https://example.com/video.mp4`

### 5. カテゴリーについて

使用可能なカテゴリー：
- `MV` - ミュージックビデオ
- `Commercial` - コマーシャル・広告
- `Short Film` - ショートフィルム
- `Documentary` - ドキュメンタリー

## 既存作品の編集

1. `/data/works.ts` ファイルを開く
2. 該当する作品のオブジェクトを見つける
3. 必要な項目を編集
4. ファイルを保存

## 作品の削除

1. `/data/works.ts` ファイルを開く
2. 削除したい作品のオブジェクト全体を削除
3. ファイルを保存

## 注意事項

- `id` は必ず一意の値にしてください
- 動画URLは実際にアクセス可能なものを使用してください
- サムネイル画像のアスペクト比は16:9が推奨されます
- 日本語と英語の両方で説明文を書くことが可能です

## ヒーロー動画の変更

ヒーローセクションの背景動画を変更する場合：
1. `/data/site-config.ts` ファイルを開く
2. `heroVideoUrl` の値を新しい動画URLに変更
3. ファイルを保存

```typescript
export const siteConfig = {
  heroVideoUrl: "新しい動画のURL",
  // その他の設定...
}
```
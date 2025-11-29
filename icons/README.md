# アイコン画像の作成方法

PWAアプリには以下のサイズのPNGアイコンが必要です：
- `icon-192x192.png` (192x192ピクセル)
- `icon-512x512.png` (512x512ピクセル)

## 方法1: オンラインツールを使用（推奨）

1. `icon.svg` をブラウザで開く
2. 以下のいずれかのオンラインツールでSVGをPNGに変換：
   - https://cloudconvert.com/svg-to-png
   - https://www.aconvert.com/image/svg-to-png/
   - https://convertio.co/ja/svg-png/

3. 192x192と512x512のサイズでそれぞれ変換してダウンロード

## 方法2: ImageMagick/Inkscapeを使用

```bash
# ImageMagickを使用
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 512x512 icon-512x512.png

# Inkscapeを使用
inkscape icon.svg -w 192 -h 192 -o icon-192x192.png
inkscape icon.svg -w 512 -h 512 -o icon-512x512.png
```

## 方法3: 一時的な代替案

開発中は一時的に単色のPNGを使用することもできます。
以下のコマンドでシンプルなアイコンを生成できます：

```bash
# 開発用の仮アイコンを作成（要ImageMagick）
convert -size 192x192 xc:#4A90E2 -gravity center -pointsize 80 -fill white -annotate +0+0 "勤" icon-192x192.png
convert -size 512x512 xc:#4A90E2 -gravity center -pointsize 200 -fill white -annotate +0+0 "勤" icon-512x512.png
```

## 現在の状態

現在、このディレクトリには `icon.svg` が含まれています。
PWAとして正しく動作させるには、上記の方法でPNGファイルを生成してください。

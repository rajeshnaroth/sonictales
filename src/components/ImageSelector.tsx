import { useState, useRef } from 'react'
import { Button } from './ui/button'
import { ImageWithFallback } from './figma/ImageWithFallback'
import { Upload, X } from 'lucide-react'

interface ImageSelectorProps {
  selectedImage: string
  onImageSelect: (imageUrl: string) => void
}

export function ImageSelector({ selectedImage, onImageSelect }: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // ファイルサイズチェック（5MB以下）
      if (file.size > 5 * 1024 * 1024) {
        alert('ファイルサイズは5MB以下にしてください')
        return
      }

      // 画像ファイルかチェック
      if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください')
        return
      }

      // FileReaderでプレビュー用のData URLを作成
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        onImageSelect(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    onImageSelect('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <label className="block text-sm text-gray-300 mb-2">
        サムネイル画像
      </label>
      
      {selectedImage ? (
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-800">
          <ImageWithFallback
            src={selectedImage}
            alt="選択された画像"
            className="w-full h-full object-cover"
          />
          <button
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 w-8 h-8 bg-black/70 hover:bg-black/90 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="w-full h-48 rounded-lg border-2 border-dashed border-gray-600 bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Upload className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">画像をアップロード</p>
            <p className="text-xs mt-1">JPEG, PNG, WebP (最大5MB)</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleButtonClick}
          variant="outline"
          className="flex-1 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {selectedImage ? '画像を変更' : '画像を選択'}
        </Button>
        
        {selectedImage && (
          <Button
            type="button"
            onClick={handleRemoveImage}
            variant="outline"
            className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
          >
            削除
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  )
}
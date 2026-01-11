import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { ImageSelector } from "../../shared/ImageSelector";
import { Work } from "../../../data/works";

interface WorkFormProps {
  work?: Work;
  onSave: (work: Omit<Work, "id"> | Work) => void;
  onCancel: () => void;
}

export function WorkForm({ work, onSave, onCancel }: WorkFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    category: "MV" as Work["category"],
    year: new Date().getFullYear(),
    client: "",
    artist: "",
    duration: "",
    thumbnail: "",
    videoUrl: "",
    description: "",
    credits: {
      director: "Rajesh Naroth",
      editor: "Rajesh Naroth",
      cinematographer: "",
      producer: "SonicTales"
    }
  });

  useEffect(() => {
    if (work) {
      setFormData({
        title: work.title,
        category: work.category,
        year: work.year,
        client: work.client || "",
        artist: work.artist || "",
        duration: work.duration,
        thumbnail: work.thumbnail,
        videoUrl: work.videoUrl,
        description: work.description,
        credits: {
          director: work.credits.director,
          editor: work.credits.editor,
          cinematographer: work.credits.cinematographer || "",
          producer: work.credits.producer || ""
        }
      });
    }
  }, [work]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // サムネイル画像必須チェック
    if (!formData.thumbnail) {
      alert("サムネイル画像を選択してください");
      return;
    }

    const workData = {
      ...formData,
      credits: {
        director: formData.credits.director,
        editor: formData.credits.editor,
        ...(formData.credits.cinematographer && { cinematographer: formData.credits.cinematographer }),
        ...(formData.credits.producer && { producer: formData.credits.producer })
      },
      ...(formData.client && { client: formData.client }),
      ...(formData.artist && { artist: formData.artist })
    };

    if (work) {
      onSave({ ...workData, id: work.id });
    } else {
      onSave(workData);
    }
  };

  const updateField = (field: string, value: any) => {
    if (field.startsWith("credits.")) {
      const creditField = field.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        credits: {
          ...prev.credits,
          [creditField]: value
        }
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value
      }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">{work ? "作品を編集" : "新しい作品を追加"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">作品タイトル *</label>
                <Input value={formData.title} onChange={(e) => updateField("title", e.target.value)} placeholder="例：Midnight Dreams" required className="bg-gray-800 border-gray-700 text-white" />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">カテゴリー *</label>
                <Select value={formData.category} onValueChange={(value: string) => updateField("category", value as Work["category"])}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="MV">MV (ミュージックビデオ)</SelectItem>
                    <SelectItem value="Commercial">Commercial (コマーシャル)</SelectItem>
                    <SelectItem value="Short Film">Short Film (ショートフィルム)</SelectItem>
                    <SelectItem value="Documentary">Documentary (ドキュメンタリー)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">制作年 *</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => updateField("year", parseInt(e.target.value))}
                  min="2000"
                  max="2030"
                  required
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">動画の長さ *</label>
                <Input value={formData.duration} onChange={(e) => updateField("duration", e.target.value)} placeholder="例：3:45" required className="bg-gray-800 border-gray-700 text-white" />
              </div>
            </div>

            {/* カテゴリー別フィールド */}
            {formData.category === "MV" && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">アーティスト名</label>
                <Input value={formData.artist} onChange={(e) => updateField("artist", e.target.value)} placeholder="例：Luna Sky" className="bg-gray-800 border-gray-700 text-white" />
              </div>
            )}

            {formData.category === "Commercial" && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">クライアント名</label>
                <Input value={formData.client} onChange={(e) => updateField("client", e.target.value)} placeholder="例：Nike" className="bg-gray-800 border-gray-700 text-white" />
              </div>
            )}

            {/* 動画URL */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">動画URL *</label>
              <Input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => updateField("videoUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=... または https://vimeo.com/..."
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* 画像選択 */}
            <ImageSelector selectedImage={formData.thumbnail} onImageSelect={(imageUrl) => updateField("thumbnail", imageUrl)} />

            {/* 説明文 */}
            <div>
              <label className="block text-sm text-gray-300 mb-2">作品の説明 *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="作品の詳細な説明を入力してください..."
                rows={4}
                required
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            {/* クレジット情報 */}
            <div className="space-y-4">
              <h3 className="text-lg text-white">クレジット情報</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">ディレクター *</label>
                  <Input value={formData.credits.director} onChange={(e) => updateField("credits.director", e.target.value)} required className="bg-gray-800 border-gray-700 text-white" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">エディター *</label>
                  <Input value={formData.credits.editor} onChange={(e) => updateField("credits.editor", e.target.value)} required className="bg-gray-800 border-gray-700 text-white" />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">撮影監督</label>
                  <Input
                    value={formData.credits.cinematographer}
                    onChange={(e) => updateField("credits.cinematographer", e.target.value)}
                    placeholder="オプション"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">プロデューサー</label>
                  <Input
                    value={formData.credits.producer}
                    onChange={(e) => updateField("credits.producer", e.target.value)}
                    placeholder="オプション"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex gap-4 pt-6">
              <Button type="submit" className="flex-1 bg-white text-black hover:bg-gray-200">
                {work ? "変更を保存" : "作品を追加"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

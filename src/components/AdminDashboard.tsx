import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "./ui/alert-dialog";
import { Badge } from "./ui/badge";
import { WorkForm } from "./WorkForm";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Work } from "../data/works";
import { Pencil, Trash2, Plus, Home } from "lucide-react";
import sonicTalesLogo from "@/assets/8e180fd67a0c0bd01f42002dab2e7103c2e61e1f.png";

interface AdminDashboardProps {
  works: Work[];
  onWorksUpdate: (works: Work[]) => void;
  onLogout: () => void;
  onBackToSite: () => void;
}

export function AdminDashboard({ works, onWorksUpdate, onLogout, onBackToSite }: AdminDashboardProps) {
  const [currentView, setCurrentView] = useState<"list" | "add" | "edit">("list");
  const [editingWork, setEditingWork] = useState<Work | null>(null);

  const handleAddWork = (workData: Omit<Work, "id">) => {
    const newId = (Math.max(...works.map((w) => parseInt(w.id)), 0) + 1).toString();
    const newWork: Work = { ...workData, id: newId };
    onWorksUpdate([...works, newWork]);
    setCurrentView("list");
  };

  const handleEditWork = (workData: Work) => {
    const updatedWorks = works.map((w) => (w.id === workData.id ? workData : w));
    onWorksUpdate(updatedWorks);
    setCurrentView("list");
    setEditingWork(null);
  };

  const handleDeleteWork = (workId: string) => {
    const updatedWorks = works.filter((w) => w.id !== workId);
    onWorksUpdate(updatedWorks);
  };

  const startEdit = (work: Work) => {
    setEditingWork(work);
    setCurrentView("edit");
  };

  const getCategoryBadgeColor = (category: Work["category"]) => {
    switch (category) {
      case "MV":
        return "bg-purple-600";
      case "Commercial":
        return "bg-blue-600";
      case "Short Film":
        return "bg-green-600";
      case "Documentary":
        return "bg-orange-600";
      default:
        return "bg-gray-600";
    }
  };

  if (currentView === "add") {
    return <WorkForm onSave={handleAddWork} onCancel={() => setCurrentView("list")} />;
  }

  if (currentView === "edit" && editingWork) {
    return (
      <WorkForm
        work={editingWork}
        onSave={(workData: Work | Omit<Work, "id">) => {
          if ("id" in workData) {
            handleEditWork(workData as Work);
          } else {
            // This shouldn't happen in edit mode but handle it gracefully
            console.error("Unexpected work data format in edit mode");
          }
        }}
        onCancel={() => {
          setCurrentView("list");
          setEditingWork(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <img src={sonicTalesLogo} alt="SonicTales" className="h-12 w-auto" />
            <div>
              <h1 className="text-3xl text-white mb-2">作品管理システム</h1>
              <p className="text-gray-400">作品の追加・編集・削除を行えます</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={onBackToSite} variant="outline" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              サイトに戻る
            </Button>
            <Button onClick={onLogout} variant="outline">
              ログアウト
            </Button>
          </div>
        </div>

        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400">Total Films</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-white">{works.length}</div>
            </CardContent>
          </Card>

          {(["MV", "Commercial", "Short Film", "Documentary"] as const).map((category) => (
            <Card key={category} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-400">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl text-white">{works.filter((w) => w.category === category).length}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl text-white">作品一覧</h2>
          <Button onClick={() => setCurrentView("add")} className="bg-white text-black hover:bg-gray-200 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新しい作品を追加
          </Button>
        </div>

        {/* 作品一覧 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((work) => (
            <Card key={work.id} className="bg-gray-900 border-gray-800 overflow-hidden">
              <div className="aspect-video relative">
                <ImageWithFallback src={work.thumbnail} alt={work.title} className="w-full h-full object-cover" />
                <div className="absolute top-2 left-2">
                  <Badge className={`${getCategoryBadgeColor(work.category)} text-white`}>{work.category}</Badge>
                </div>
              </div>

              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg text-white truncate">{work.title}</h3>
                  <span className="text-sm text-gray-400">{work.year}</span>
                </div>

                <div className="text-sm text-gray-400 mb-3">
                  {work.artist && <span>Artist: {work.artist}</span>}
                  {work.client && <span>Client: {work.client}</span>}
                  <div>Duration: {work.duration}</div>
                </div>

                <p
                  className="text-sm text-gray-300 mb-4 overflow-hidden"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical"
                  }}
                >
                  {work.description}
                </p>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => startEdit(work)} className="flex-1 flex items-center gap-1">
                    <Pencil className="w-3 h-3" />
                    編集
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex items-center gap-1 text-red-400 border-red-400 hover:bg-red-400 hover:text-white">
                        <Trash2 className="w-3 h-3" />
                        削除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gray-900 border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">作品を削除しますか？</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">「{work.title}」を削除します。この操作は取り消せません。</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteWork(work.id)} className="bg-red-600 hover:bg-red-700">
                          削除する
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {works.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl text-gray-400 mb-4">まだ作品がありません</h3>
            <p className="text-gray-500 mb-6">最初の作品を追加してみましょう</p>
            <Button onClick={() => setCurrentView("add")} className="bg-white text-black hover:bg-gray-200">
              作品を追加
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

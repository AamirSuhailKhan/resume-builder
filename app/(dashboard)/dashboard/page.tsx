"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { storage, ResumeData } from "@/lib/storage";

export default function DashboardPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setResumes(storage.getResumes());
    setIsLoaded(true);
  }, []);

  const handleCreateNew = () => {
    const newResume = storage.createEmptyResume();
    storage.saveResume(newResume);
    router.push(`/builder?id=${newResume.id}`);
  };

  const handleDelete = (id: string) => {
    storage.deleteResume(id);
    setResumes(storage.getResumes());
  };

  if (!isLoaded) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Your Resumes</h1>
          <p className="text-gray-500 mt-1">Manage and edit your professional resumes.</p>
        </div>
        <Button onClick={handleCreateNew} className="shadow-sm shadow-primary/20">
          <Plus className="mr-2 h-4 w-4" />
          Create New Resume
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.map((resume) => (
          <div key={resume.id} className="group relative h-[240px] rounded-2xl border border-gray-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.04)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.08)] flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1">
            <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg truncate w-full text-center">{resume.title}</h3>
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(resume.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <div className="p-4 flex items-center justify-between bg-white">
              <Button variant="ghost" size="icon" onClick={() => handleDelete(resume.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link href={`/builder?id=${resume.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {resumes.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
            <p className="text-gray-500 mb-4">You don't have any resumes yet.</p>
            <Button onClick={handleCreateNew} variant="outline">Create your first resume</Button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useResumeStore, selectAddItem, selectRemoveItem, selectReorderItem } from "@/store/useResumeStore";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";

interface ExperienceArrayProps {
  items: any[];
  isEditing: boolean;
  renderItem: (item: any, index: number) => React.ReactNode;
}

export const ExperienceArray = ({ items, isEditing, renderItem }: ExperienceArrayProps) => {
  const addItem = useResumeStore(selectAddItem);
  const removeItem = useResumeStore(selectRemoveItem);
  const reorderItem = useResumeStore(selectReorderItem);

  return (
    <div className="space-y-6 relative group/section">
      {items.length === 0 && !isEditing && (
        <p className="text-gray-400 italic">No experience added.</p>
      )}
      
      {items.map((item, index) => (
        <div key={item.id || index} className="relative group/item">
          
          {/* Controls - Only visible when editing and hovering */}
          {isEditing && (
            <div className="absolute -left-10 top-0 opacity-0 group-hover/item:opacity-100 transition-opacity flex flex-col gap-1 bg-white border border-gray-200 shadow-sm rounded-md p-1 z-10 print:hidden">
              <button 
                onClick={() => index > 0 && reorderItem("experience", index, index - 1)}
                disabled={index === 0}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move Up"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button 
                onClick={() => index < items.length - 1 && reorderItem("experience", index, index + 1)}
                disabled={index === items.length - 1}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Move Down"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <button 
                onClick={() => removeItem("experience", index)}
                className="p-1 hover:bg-red-50 text-red-500 rounded"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {/* Actual item content */}
          <div className={isEditing ? "p-2 -m-2 rounded-lg hover:bg-slate-50/50 transition-colors" : ""}>
            {renderItem(item, index)}
          </div>
          
        </div>
      ))}
      
      {/* Add New Button */}
      {isEditing && (
        <button
          onClick={() => addItem("experience")}
          className="w-full py-3 mt-4 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover/section:opacity-100 focus:opacity-100 print:hidden shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Experience
        </button>
      )}
    </div>
  );
};

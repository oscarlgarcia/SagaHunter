"use client";

import { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X, Sparkles } from "lucide-react";

export interface Scene {
  scene: number;
  description: string;
  characters?: string[];
  setting?: string;
}

interface SceneListProps {
  scenes: Scene[];
  onChange: (scenes: Scene[]) => void;
  onGenerate: () => void;
  generating?: boolean;
}

function SortableScene({ scene, index, onUpdate, onRemove }: {
  scene: Scene; index: number; onUpdate: (s: Scene) => void; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `scene-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg p-3">
      <button {...attributes} {...listeners} className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing" type="button">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-xs font-mono text-gray-400 mt-1.5 w-5 shrink-0">{scene.scene}</span>
      <input
        value={scene.description}
        onChange={(e) => onUpdate({ ...scene, description: e.target.value })}
        className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-saga-400"
        placeholder="Scene description..."
      />
      <input
        value={scene.setting || ""}
        onChange={(e) => onUpdate({ ...scene, setting: e.target.value })}
        className="w-28 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-saga-400"
        placeholder="Setting"
      />
      <button onClick={onRemove} className="mt-1 text-gray-400 hover:text-red-500 transition-colors" type="button">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function SceneList({ scenes, onChange, onGenerate, generating }: SceneListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = scenes.findIndex((_, i) => `scene-${i}` === active.id);
    const newIdx = scenes.findIndex((_, i) => `scene-${i}` === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(scenes, oldIdx, newIdx).map((s, i) => ({ ...s, scene: i + 1 }));
    onChange(reordered);
  };

  const addScene = () => {
    onChange([...scenes, { scene: scenes.length + 1, description: "" }]);
  };

  const updateScene = (idx: number, updated: Scene) => {
    const next = [...scenes];
    next[idx] = updated;
    onChange(next);
  };

  const removeScene = (idx: number) => {
    const next = scenes.filter((_, i) => i !== idx).map((s, i) => ({ ...s, scene: i + 1 }));
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={scenes.map((_, i) => `scene-${i}`)} strategy={verticalListSortingStrategy}>
          {scenes.map((scene, i) => (
            <SortableScene
              key={`scene-${i}`}
              scene={scene} index={i}
              onUpdate={(s) => updateScene(i, s)}
              onRemove={() => removeScene(i)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {scenes.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No scenes defined yet.</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={addScene} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" type="button">
          <Plus className="w-3 h-3" /> Add Scene
        </button>
        <button onClick={onGenerate} disabled={generating} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50" type="button">
          <Sparkles className="w-3 h-3" /> {generating ? "Generating..." : "Generate Scenes"}
        </button>
      </div>
    </div>
  );
}

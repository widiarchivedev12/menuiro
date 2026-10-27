"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  deleteCategory,
  deleteMenuItem,
  reorderMenuItems,
  toggleMenuItemAvailable,
  updateCategory,
} from "@/app/dashboard/menu/actions";
import type { CategoryWithItems } from "@/app/dashboard/menu/page";
import { formatRupiah } from "@/lib/format-rupiah";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/database";

type Props = {
  businessId: string;
  category: CategoryWithItems;
  dragHandleProps?: Record<string, unknown>;
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem, categoryId: string) => void;
  onRefresh: () => void;
};

function storageUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/${path}`;
}

function SortableItemRow({
  item,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: MenuItem;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-50 border border-zinc-100",
        isDragging && "opacity-50 bg-white shadow-md",
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 transition-colors shrink-0 touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Thumbnail */}
      <div className="w-9 h-9 rounded-lg bg-zinc-100 overflow-hidden shrink-0 flex items-center justify-center">
        {item.image_path ? (
          <Image
            src={storageUrl(item.image_path)}
            alt={item.name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            unoptimized
          />
        ) : (
          <ImageIcon className="w-4 h-4 text-zinc-300" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              "text-sm font-medium truncate",
              !item.is_available && "line-through text-zinc-400",
            )}
          >
            {item.name}
          </p>
          {!item.is_available && (
            <span className="shrink-0 text-[10px] bg-zinc-100 text-zinc-500 rounded px-1.5 py-0.5 font-medium">
              Habis
            </span>
          )}
          {item.is_featured && (
            <span className="shrink-0 text-[10px] bg-orange-50 text-orange-500 rounded px-1.5 py-0.5 font-medium">
              Andalan
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500">{formatRupiah(item.price)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onToggle}
          title={item.is_available ? "Tandai habis" : "Tandai tersedia"}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-md text-xs font-semibold transition-colors",
            item.is_available
              ? "bg-green-50 text-green-600 hover:bg-green-100"
              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200",
          )}
        >
          {item.is_available ? "✓" : "✗"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CategoryCard({
  businessId: _businessId,
  category,
  dragHandleProps,
  onAddItem,
  onEditItem,
  onRefresh,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [items, setItems] = useState(category.menu_items);
  const [isPending, startTransition] = useTransition();
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    setItems(category.menu_items);
  }, [category.menu_items]);

  useEffect(() => {
    setEditName(category.name);
  }, [category.name]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    startTransition(() => {
      reorderMenuItems(
        reordered.map((item, idx) => ({ id: item.id, sort_order: idx })),
      );
    });
  }

  function handleSaveName() {
    if (!editName.trim() || editName === category.name) {
      setEditName(category.name);
      setIsEditing(false);
      return;
    }
    startTransition(async () => {
      await updateCategory(category.id, editName.trim());
      setIsEditing(false);
      onRefresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Hapus kategori "${category.name}" dan semua itemnya?`))
      return;
    startTransition(async () => {
      await deleteCategory(category.id);
      onRefresh();
    });
  }

  function handleDeleteItem(itemId: string) {
    if (!confirm("Hapus item ini?")) return;
    startTransition(async () => {
      await deleteMenuItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      onRefresh();
    });
  }

  function handleToggleItem(item: MenuItem) {
    startTransition(async () => {
      await toggleMenuItemAvailable(item.id, !item.is_available);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: !i.is_available } : i,
        ),
      );
    });
  }

  return (
    <div className="rounded-xl bg-white border border-zinc-100 shadow-sm overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-zinc-50 border-b border-zinc-100">
        {/* External drag handle (from parent sortable context) */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 transition-colors shrink-0 touch-none"
          {...(dragHandleProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {isEditing ? (
          <input
            ref={editInputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") {
                setEditName(category.name);
                setIsEditing(false);
              }
            }}
            className="flex-1 rounded-md border border-orange-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-900 outline-none focus:ring-2 focus:ring-orange-100"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex-1 text-left text-sm font-semibold text-zinc-900 hover:text-orange-600 transition-colors"
          >
            {category.name}
            <span className="ml-1.5 text-xs font-normal text-zinc-400">
              ({items.length} item)
            </span>
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Items list */}
      {expanded && (
        <div className="p-3 flex flex-col gap-2">
          <DndContext
            id={`items-dnd-${category.id}`}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleItemDragEnd}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => onEditItem(item, category.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onToggle={() => handleToggleItem(item)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {items.length === 0 && (
            <p className="text-center text-xs text-zinc-400 py-3">
              Belum ada item. Tambahkan item pertama!
            </p>
          )}

          <button
            type="button"
            onClick={() => onAddItem(category.id)}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-200 py-2 text-xs font-medium text-zinc-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah item
          </button>
        </div>
      )}
    </div>
  );
}

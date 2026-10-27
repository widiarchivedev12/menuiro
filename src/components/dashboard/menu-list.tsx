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
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  createCategory,
  reorderCategories,
} from "@/app/dashboard/menu/actions";
import type { CategoryWithItems } from "@/app/dashboard/menu/page";
import type { MenuItem } from "@/types/database";
import { CategoryCard } from "./category-card";
import { MenuItemForm } from "./menu-item-form";

type Props = {
  businessId: string;
  initialCategories: CategoryWithItems[];
};

type FormState =
  | { mode: "add"; categoryId: string }
  | { mode: "edit"; item: MenuItem; categoryId: string }
  | null;

function SortableCategoryCard({
  businessId,
  category,
  onAddItem,
  onEditItem,
  onRefresh,
}: {
  businessId: string;
  category: CategoryWithItems;
  onAddItem: (categoryId: string) => void;
  onEditItem: (item: MenuItem, categoryId: string) => void;
  onRefresh: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : undefined}
    >
      <CategoryCard
        businessId={businessId}
        category={category}
        dragHandleProps={{ ...attributes, ...listeners }}
        onAddItem={onAddItem}
        onEditItem={onEditItem}
        onRefresh={onRefresh}
      />
    </div>
  );
}

export function MenuList({ businessId, initialCategories }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [formState, setFormState] = useState<FormState>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [isPending, startTransition] = useTransition();
  const categoryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingCategory) categoryInputRef.current?.focus();
  }, [addingCategory]);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleCategoryDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);
    setCategories(reordered);
    startTransition(() => {
      reorderCategories(reordered.map((c) => c.id));
    });
  }

  function handleAddCategory() {
    if (!newCategoryName.trim()) return;
    startTransition(async () => {
      const result = await createCategory(newCategoryName.trim());
      if (!result.error) {
        setNewCategoryName("");
        setAddingCategory(false);
        router.refresh();
      }
    });
  }

  function handleRefresh() {
    router.refresh();
  }

  const formCategory = formState
    ? categories.find((c) => c.id === formState.categoryId)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Category DnD list */}
      <DndContext
        id="categories-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleCategoryDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((cat) => (
            <SortableCategoryCard
              key={cat.id}
              businessId={businessId}
              category={cat}
              onAddItem={(cId) =>
                setFormState({ mode: "add", categoryId: cId })
              }
              onEditItem={(item, cId) =>
                setFormState({ mode: "edit", item, categoryId: cId })
              }
              onRefresh={handleRefresh}
            />
          ))}
        </SortableContext>
      </DndContext>

      {categories.length === 0 && !addingCategory && (
        <div className="text-center py-10 text-sm text-zinc-400">
          Belum ada kategori. Buat kategori pertama kamu!
        </div>
      )}

      {/* Add category */}
      {addingCategory ? (
        <div className="flex items-center gap-2">
          <input
            ref={categoryInputRef}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddCategory();
              if (e.key === "Escape") {
                setNewCategoryName("");
                setAddingCategory(false);
              }
            }}
            placeholder="Nama kategori, cth. Minuman, Makanan Berat"
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
          />
          <button
            type="button"
            onClick={handleAddCategory}
            disabled={isPending || !newCategoryName.trim()}
            className="rounded-full bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
          >
            {isPending ? "..." : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setNewCategoryName("");
              setAddingCategory(false);
            }}
            className="rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingCategory(true)}
          className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-200 py-3.5 text-sm font-medium text-zinc-500 hover:border-orange-300 hover:text-orange-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kategori
        </button>
      )}

      {/* Item form modal */}
      {formState && formCategory && (
        <MenuItemForm
          businessId={businessId}
          categoryId={formState.categoryId}
          categoryName={formCategory.name}
          item={formState.mode === "edit" ? formState.item : undefined}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

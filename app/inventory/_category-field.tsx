import { inputClassName } from "./_components";

type CategoryOption = {
  id: string;
  name: string;
};

export function InventoryCategoryField({
  categories,
  defaultCategoryId,
}: {
  categories: CategoryOption[];
  defaultCategoryId?: string | null;
}) {
  return (
    <div className="grid gap-3">
      <select
        className={inputClassName}
        name="categoryId"
        defaultValue={defaultCategoryId || ""}
      >
        <option value="">بدون تصنيف</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <div className="relative flex items-center gap-3 text-[10px] font-bold text-slate-400">
        <span className="h-px flex-1 bg-slate-100" />
        <span>أو أضف تصنيفاً جديداً</span>
        <span className="h-px flex-1 bg-slate-100" />
      </div>
      <input
        className={inputClassName}
        name="newCategoryName"
        placeholder="مثال: شاشات، بطاريات، كابلات..."
        maxLength={120}
      />
      <p className="text-[10px] font-medium leading-relaxed text-slate-400">
        إذا كتبت اسماً جديداً فسيتم حفظه تلقائياً واختياره لهذه القطعة، وسيظهر في القائمة مستقبلاً.
      </p>
    </div>
  );
}

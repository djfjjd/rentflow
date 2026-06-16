"use client";

export function Pagination({
  page,
  totalItems,
  pageSize = 10,
  onPageChange,
}: {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const current = Math.min(Math.max(page, 1), totalPages);
  const pages = pageNumbers(current, totalPages);

  return (
    <nav className="mt-3 flex items-center justify-center gap-2 text-sm font-black">
      <button className="small-btn hidden sm:inline-flex" type="button" onClick={() => onPageChange(1)} disabled={current === 1}>
        맨처음
      </button>
      <button className="small-btn sm:hidden" type="button" onClick={() => onPageChange(1)} disabled={current === 1}>
        처음
      </button>
      <button className="small-btn" type="button" onClick={() => onPageChange(current - 1)} disabled={current === 1}>
        이전
      </button>
      <span className="small-btn sm:hidden">{current}/{totalPages}</span>
      <div className="hidden items-center gap-2 sm:flex">
        {pages.map((item, index) =>
          item === "..." ? (
            <span className="px-2" key={`${item}-${index}`}>...</span>
          ) : (
            <button
              className={`small-btn ${item === current ? "border-[#116149] bg-[#116149] text-white" : ""}`}
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <button className="small-btn" type="button" onClick={() => onPageChange(current + 1)} disabled={current === totalPages}>
        다음
      </button>
      <button className="small-btn hidden sm:inline-flex" type="button" onClick={() => onPageChange(totalPages)} disabled={current === totalPages}>
        맨끝
      </button>
      <button className="small-btn sm:hidden" type="button" onClick={() => onPageChange(totalPages)} disabled={current === totalPages}>
        끝
      </button>
    </nav>
  );
}

function pageNumbers(current: number, total: number): Array<number | "..."> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", current, "...", total];
}

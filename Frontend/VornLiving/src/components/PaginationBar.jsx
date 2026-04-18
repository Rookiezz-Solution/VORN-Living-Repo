import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PaginationBar = ({ page, pageSize = 10, totalCount = 0, onPageChange, className = '' }) => {
  const safeTotal = Number.isFinite(Number(totalCount)) ? Number(totalCount) : 0;
  const safeSize = Number.isFinite(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : 10;
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = safeTotal === 0 ? 0 : (safePage - 1) * safeSize + 1;
  const end = safeTotal === 0 ? 0 : Math.min(safeTotal, safePage * safeSize);
  const showControls = safeTotal > safeSize;

  return (
    <div className={`mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
      <div className="text-sm text-secondary">
        Total: <span className="font-semibold">{safeTotal}</span>
        <span className="ml-2 text-secondary/70">Showing {start}-{end}</span>
      </div>
      {showControls ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rf-icon-btn border border-border bg-white hover:border-primary disabled:opacity-50"
            onClick={() => onPageChange(1)}
            disabled={safePage <= 1}
            title="First page"
          >
            <ChevronsLeft className="h-5 w-5 text-secondary" />
          </button>
          <button
            type="button"
            className="rf-icon-btn border border-border bg-white hover:border-primary disabled:opacity-50"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            title="Previous page"
          >
            <ChevronLeft className="h-5 w-5 text-secondary" />
          </button>
          <div className="px-3 py-2 rounded-xl border border-border bg-white text-sm text-secondary">
            Page <span className="font-semibold">{safePage}</span> / {totalPages}
          </div>
          <button
            type="button"
            className="rf-icon-btn border border-border bg-white hover:border-primary disabled:opacity-50"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            title="Next page"
          >
            <ChevronRight className="h-5 w-5 text-secondary" />
          </button>
          <button
            type="button"
            className="rf-icon-btn border border-border bg-white hover:border-primary disabled:opacity-50"
            onClick={() => onPageChange(totalPages)}
            disabled={safePage >= totalPages}
            title="Last page"
          >
            <ChevronsRight className="h-5 w-5 text-secondary" />
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default PaginationBar;

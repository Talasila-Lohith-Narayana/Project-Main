import { useEffect, useId, useState } from "react";

export default function TablePagination({
  page,
  pageCount,
  totalItems,
  itemLabel,
  onPageChange,
  className = "",
}) {
  const inputId = useId();
  const [pageInput, setPageInput] = useState(String(page));
  const lastPage = Math.max(1, pageCount || 1);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const goToPage = () => {
    const requestedPage = Number.parseInt(pageInput, 10);
    if (!Number.isInteger(requestedPage)) {
      setPageInput(String(page));
      return;
    }
    onPageChange(Math.min(Math.max(requestedPage, 1), lastPage));
  };

  return (
    <div className={`pager${className ? ` ${className}` : ""}`}>
      <div className="pagerInfo">
        <span>
          Page <strong>{page}</strong> of <strong>{lastPage}</strong>
        </span>
        <span className="pagerDivider">•</span>
        <span className="pagerTotal">
          <strong>{Number(totalItems).toLocaleString("en-US")}</strong>{" "}
          {`${itemLabel}${totalItems === 1 ? "" : "s"}`}
        </span>
      </div>
      <div className="pagerControls">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          title="Previous page"
          aria-label="Previous page"
        >
          ‹
        </button>
        <div className="pageJump" aria-label="Jump to page">
          <label htmlFor={inputId}>Page</label>
          <input
            type="text"
            id={inputId}
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") goToPage();
            }}
            aria-label="Page number"
          />
          <button type="button" onClick={goToPage}>Go</button>
        </div>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
          title="Next page"
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}

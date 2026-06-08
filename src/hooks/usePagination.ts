import { useState } from "react"

export function usePagination<T>(items: T[], perPage = 10) {
    const [page, setPage] = useState(1)

    const totalPages = Math.max(1, Math.ceil(items.length / perPage))
    const safePage = Math.min(page, totalPages)

    const paginated = items.slice((safePage - 1) * perPage, safePage * perPage)

    return {
        page: safePage,
        totalPages,
        paginated,
        setPage,
        hasPrev: safePage > 1,
        hasNext: safePage < totalPages,
    }
}
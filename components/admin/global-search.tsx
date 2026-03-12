"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, Users, Building2, FolderTree, FileText, Clock } from "lucide-react"
import { getAllUsers } from "@/lib/actions/users"
import { getBusinessUnitGroups } from "@/lib/actions/master-data"
import { getFunctionalAreas } from "@/lib/actions/admin"
import { getCategories } from "@/lib/actions/master-data"

interface SearchResult {
  type: "user" | "business_group" | "functional_area" | "category"
  id: number
  name: string
  subtitle?: string
  icon: React.ReactNode
}

interface GlobalSearchProps {
  onResultClick?: (result: SearchResult) => void
  placeholder?: string
}

export default function GlobalSearch({ onResultClick, placeholder = "Search users, BGs, FAs, categories..." }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    const search = async () => {
      setLoading(true)
      setShowResults(true)

      try {
        const [usersResult, bgResult, faResult, catResult] = await Promise.all([
          getAllUsers({ search: query, includeInactive: true }),
          getBusinessUnitGroups(),
          getFunctionalAreas(),
          getCategories(),
        ])

        const searchResults: SearchResult[] = []

        // Users
        if (usersResult.success && usersResult.data) {
          usersResult.data
            .filter((u: any) =>
              u.full_name?.toLowerCase().includes(query.toLowerCase()) ||
              u.email?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5)
            .forEach((user: any) => {
              searchResults.push({
                type: "user",
                id: user.id,
                name: user.full_name || user.email,
                subtitle: user.email,
                icon: <Users className="w-4 h-4" />,
              })
            })
        }

        // Business Groups
        if (bgResult.success && bgResult.data) {
          bgResult.data
            .filter((bg: any) => bg.name?.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .forEach((bg: any) => {
              searchResults.push({
                type: "business_group",
                id: bg.id,
                name: bg.name,
                subtitle: `Business Group`,
                icon: <Building2 className="w-4 h-4" />,
              })
            })
        }

        // Functional Areas
        if (faResult.success && faResult.data) {
          faResult.data
            .filter((fa: any) =>
              fa.name?.toLowerCase().includes(query.toLowerCase()) ||
              fa.description?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5)
            .forEach((fa: any) => {
              searchResults.push({
                type: "functional_area",
                id: fa.id,
                name: fa.name,
                subtitle: fa.description || "Functional Area",
                icon: <FolderTree className="w-4 h-4" />,
              })
            })
        }

        // Categories
        if (catResult.success && catResult.data) {
          catResult.data
            .filter((cat: any) => cat.name?.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
            .forEach((cat: any) => {
              searchResults.push({
                type: "category",
                id: cat.id,
                name: cat.name,
                subtitle: cat.description || "Category",
                icon: <FileText className="w-4 h-4" />,
              })
            })
        }

        setResults(searchResults)
      } catch (error) {
        console.error("Search error:", error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(search, 300) // Debounce
    return () => clearTimeout(timeoutId)
  }, [query])

  const handleResultClick = (result: SearchResult) => {
    setShowResults(false)
    setQuery("")
    onResultClick?.(result)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "user":
        return "User"
      case "business_group":
        return "Business Group"
      case "functional_area":
        return "Functional Area"
      case "category":
        return "Category"
      default:
        return ""
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary/5 group-focus-within:bg-primary/10 transition-all duration-300">
            <Search className="w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query && setShowResults(true)}
            placeholder={placeholder}
            className="w-full pl-11 pr-11 py-2.5 border-2 border-border/50 rounded-lg bg-background/90 backdrop-blur-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-md hover:shadow-lg group-focus-within:shadow-xl transition-all duration-300 font-medium"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("")
                setResults([])
                setShowResults(false)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted/80 hover:scale-110 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {showResults && (query || results.length > 0) && (
        <div className="absolute top-full mt-1.5 w-full bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="p-4 text-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Searching...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center">
              <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-1">
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}-${idx}`}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-2 px-3 py-2 hover:bg-gradient-to-r hover:from-muted/50 hover:to-muted/30 transition-all duration-200 text-left border-b border-border/30 last:border-0 group"
                >
                  <div className="mt-0.5 p-1.5 rounded-md bg-muted/30 group-hover:bg-muted/50 transition-colors text-muted-foreground group-hover:text-primary">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{result.name}</p>
                    {result.subtitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 px-1.5 py-0.5 bg-muted/30 rounded-full inline-block">{getTypeLabel(result.type)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

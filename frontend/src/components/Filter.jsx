import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

const Filter = ({ onSearch, placeholder = "Search..." }) => {
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const debounceRef = useRef(null);

    const handleClear = () => {
        setQuery('')
        onSearch('')
    }

    const handleChange = (e) => {
        const value = e.target.value;
        setQuery(value)
    }

    useEffect(() => {
        // Clear previous timer if exists
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            onSearch(query)
        }, 800)

        return () => clearTimeout(debounceRef.current)
    }, [query])

    return (
        <div className={`
            flex items-center gap-2 bg-white rounded-lg border transition-all duration-200
            ${isFocused ? 'border-blue-400 shadow-sm ring-2 ring-blue-100' : 'border-gray-300 hover:border-gray-400'}
            px-3 py-2
        `}>
            <Search className={`w-4 h-4 flex-shrink-0 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />

            <input
                type="text"
                name="filter-query"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={(e) => e.stopPropagation()}
                value={query}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 placeholder:text-gray-400"
            />

            {query && (
                <button
                    onClick={handleClear}
                    className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="Clear search"
                >
                    <X className="w-3 h-3 text-gray-400" />
                </button>
            )}
        </div>
    )
}

export default Filter
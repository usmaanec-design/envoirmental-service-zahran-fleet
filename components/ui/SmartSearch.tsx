import React, { useState, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchResult<T> {
  item: T;
  score: number;
  matches?: readonly Fuse.FuseResultMatch[];
}

interface SmartSearchProps<T> {
  data: T[];
  searchKeys: string[];
  placeholder?: string;
  onSelect?: (item: T) => void;
  onSearchChange?: (query: string, results: T[]) => void;
  threshold?: number;
  maxResults?: number;
  showRecentSearches?: boolean;
  renderResult?: (item: T, highlight: (text: string, matches?: readonly Fuse.FuseResultMatch[]) => React.ReactNode) => React.ReactNode;
}

function SmartSearch<T>({
  data,
  searchKeys,
  placeholder = 'Search...',
  onSelect,
  onSearchChange,
  threshold = 0.3,
  maxResults = 10,
  showRecentSearches = true,
  renderResult,
}: SmartSearchProps<T>) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult<T>[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse.js
  const fuse = new Fuse(data, {
    keys: searchKeys,
    threshold,
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
  });

  // Load recent searches from localStorage
  useEffect(() => {
    if (showRecentSearches) {
      const saved = localStorage.getItem('recentSearches');
      if (saved) {
        try {
          setRecentSearches(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading recent searches:', e);
        }
      }
    }
  }, [showRecentSearches]);

  // Handle search
  useEffect(() => {
    if (query.trim().length > 0) {
      const searchResults = fuse.search(query).slice(0, maxResults);
      setResults(searchResults);
      setSelectedIndex(0);
      setIsOpen(true);
      
      if (onSearchChange) {
        onSearchChange(query, searchResults.map(r => r.item));
      }
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, data, maxResults]);

  // Save recent search
  const saveRecentSearch = (searchQuery: string) => {
    if (!showRecentSearches || !searchQuery.trim()) return;
    
    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  // Handle selection
  const handleSelect = (item: T) => {
    saveRecentSearch(query);
    setQuery('');
    setIsOpen(false);
    onSelect?.(item);
  };

  // Highlight matched text
  const highlightText = (text: string, matches?: readonly Fuse.FuseResultMatch[]) => {
    if (!matches || matches.length === 0) return text;

    const match = matches[0];
    if (!match.indices || match.indices.length === 0) return text;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    match.indices.forEach(([start, end]) => {
      if (start > lastIndex) {
        parts.push(text.substring(lastIndex, start));
      }
      parts.push(
        <span key={`${start}-${end}`} className="bg-yellow-200 dark:bg-yellow-600 text-gray-900 dark:text-gray-100 font-semibold">
          {text.substring(start, end + 1)}
        </span>
      );
      lastIndex = end + 1;
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].item);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 pl-11 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                   rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                   focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
        />
        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <i className="fas fa-times"></i>
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
                     rounded-lg shadow-xl max-h-96 overflow-y-auto z-50"
          >
            {/* Recent Searches */}
            {showRecentSearches && !query && recentSearches.length > 0 && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                  Recent Searches
                </div>
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => setQuery(search)}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center gap-2"
                  >
                    <i className="fas fa-history text-gray-400 text-xs"></i>
                    {search}
                  </button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {results.length > 0 ? (
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2">
                  {results.length} result{results.length !== 1 ? 's' : ''} found
                </div>
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(result.item)}
                    className={`
                      w-full px-3 py-2.5 text-left text-sm rounded transition-colors
                      ${index === selectedIndex 
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    {renderResult 
                      ? renderResult(result.item, (text) => highlightText(text, result.matches))
                      : <div>{highlightText(JSON.stringify(result.item), result.matches)}</div>
                    }
                  </button>
                ))}
              </div>
            ) : query && (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <i className="fas fa-search text-3xl mb-2 opacity-50"></i>
                <p className="text-sm">No results found for "{query}"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SmartSearch;

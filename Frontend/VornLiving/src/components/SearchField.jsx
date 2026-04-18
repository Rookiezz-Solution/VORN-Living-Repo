import React from 'react';
import { Search } from 'lucide-react';

const SearchField = ({
  value,
  onChange,
  placeholder = 'Search…',
  onSearch,
  className = '',
  inputClassName = '',
  inputWidthClassName = 'w-64'
}) => {
  return (
    <div className={`relative ${className}`}>
      {onSearch ? (
        <button
          type="button"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/70 hover:text-primary transition"
          onClick={onSearch}
          title="Search"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      ) : (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary/70 pointer-events-none">
          <Search className="h-5 w-5" />
        </div>
      )}
      <input
        value={value}
        onChange={onChange}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onSearch) onSearch();
        }}
        className={`rf-input ${inputWidthClassName} pl-11 pr-4 ${inputClassName}`}
        placeholder={placeholder}
      />
    </div>
  );
};

export default SearchField;

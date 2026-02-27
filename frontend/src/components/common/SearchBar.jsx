import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function SearchBar({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSearch,
  className = ''
}) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(input);
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    setInput('');
    onChange?.('');
    onSearch?.('');
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      <input
        type="text"
        value={input}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-12 pr-10 py-3 bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {input && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </form>
  );
}
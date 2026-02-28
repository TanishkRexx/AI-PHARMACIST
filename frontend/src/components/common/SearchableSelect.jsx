import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronDown, X, Plus, Loader2 } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  loading = false,
  disabled = false,
  onAddNew,
  addNewLabel = "Add New Item",
  displayKey = "name",
  valueKey = "id",
  renderOption,
  className = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const searchValue = option[displayKey]?.toLowerCase() || '';
    const genericName = option.generic_name?.toLowerCase() || '';
    const brand = option.brand?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();
    
    return searchValue.includes(search) || 
           genericName.includes(search) || 
           brand.includes(search);
  });

  // Get selected option
  const selectedOption = options.find(opt => opt[valueKey] === value);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.min(prev + 1, filteredOptions.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const handleSelect = (option) => {
    onChange(option[valueKey], option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearchTerm('');
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(0);
    if (onSearch) {
      onSearch(e.target.value);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main Input/Button */}
      <div
        className={`w-full px-4 py-3 border rounded-xl flex items-center justify-between cursor-pointer transition ${
          isOpen ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200 hover:border-gray-300'
        } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedOption ? (
          <div className="flex items-center justify-between flex-1">
            <div>
              <span className="font-medium text-gray-800">{selectedOption[displayKey]}</span>
              {selectedOption.generic_name && (
                <span className="text-xs text-gray-500 ml-2">({selectedOption.generic_name})</span>
              )}
            </div>
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown 
          size={20} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            {/* Search Input */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type to search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
                {loading && (
                  <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 animate-spin" />
                )}
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? (
                    <div>
                      <p>No medicines found for "{searchTerm}"</p>
                      {onAddNew && (
                        <button
                          onClick={() => {
                            onAddNew(searchTerm);
                            setIsOpen(false);
                          }}
                          className="mt-2 text-purple-600 hover:underline flex items-center justify-center gap-1"
                        >
                          <Plus size={16} />
                          Add "{searchTerm}" as new medicine
                        </button>
                      )}
                    </div>
                  ) : (
                    <p>No options available</p>
                  )}
                </div>
              ) : (
                <>
                  {filteredOptions.map((option, index) => (
                    <div
                      key={option[valueKey]}
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`px-4 py-3 cursor-pointer transition ${
                        highlightedIndex === index 
                          ? 'bg-purple-50' 
                          : 'hover:bg-gray-50'
                      } ${value === option[valueKey] ? 'bg-purple-100' : ''}`}
                    >
                      {renderOption ? (
                        renderOption(option)
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-800">{option[displayKey]}</p>
                            {option.generic_name && (
                              <p className="text-xs text-gray-500">
                                {option.generic_name} • {option.brand}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${
                              option.stock_quantity === 0 ? 'text-red-600' :
                              option.stock_quantity <= option.reorder_level ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              Stock: {option.stock_quantity}
                            </p>
                            <p className="text-xs text-gray-500">₹{option.unit_price}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Add New Option */}
            {onAddNew && (
              <div className="border-t p-2">
                <button
                  onClick={() => {
                    onAddNew(searchTerm);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-purple-600 hover:bg-purple-50 rounded-lg flex items-center gap-2 transition"
                >
                  <Plus size={18} />
                  {addNewLabel}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
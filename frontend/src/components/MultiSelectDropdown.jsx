import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, X, Users } from 'lucide-react';

const MultiSelectDropdown = ({ 
  options = [], 
  selectedValues = [], 
  onChange, 
  placeholder = "Select options",
  label = "Teams (Optional)",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOption = (option) => {
    const isSelected = selectedValues.includes(option.name);
    let newSelectedValues;
    
    if (isSelected) {
      newSelectedValues = selectedValues.filter(value => value !== option.name);
    } else {
      newSelectedValues = [...selectedValues, option.name];
    }
    
    onChange(newSelectedValues);
  };

  const handleRemoveOption = (optionToRemove) => {
    const newSelectedValues = selectedValues.filter(value => value !== optionToRemove);
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    onChange(filteredOptions.map(option => option.name));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const displayItems = selectedValues.slice(0, 1); // Only show 1 team by default
  const remainingCount = selectedValues.length - 1;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>

      {/* Main Input Field */}
      <div className="relative">
        <div
          onClick={handleToggleDropdown}
          className="w-full min-h-[48px] px-3 py-2 border-2 border-gray-200 rounded-xl bg-blue-50/30 cursor-pointer hover:border-blue-300 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-wrap gap-2 flex-1">
              {/* Team Icon */}
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0" />
              
              {/* Selected Items */}
              {displayItems.length > 0 ? (
                <div className="flex items-center flex-wrap gap-2">
                  {displayItems.map((item, index) => {
                    const truncatedItem = item.length > 8 ? item.substring(0, 8) + '...' : item;
                    return (
                      <div
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        title={item} // Show full name on hover
                      >
                        <span>{truncatedItem}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveOption(item);
                          }}
                          className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  
                  {/* More Items Indicator */}
                  {remainingCount > 0 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                      +{remainingCount}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">{placeholder}</span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedValues.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  title="Clear all"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <button
                type="button"
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                title={isOpen ? "Close" : "Open"}
              >
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-80 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Choose Teams</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select all
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options List */}
            <div className="max-h-32 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.name);
                  return (
                    <label
                      key={option.id || option._id || option.name}
                      className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleOption(option)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.name}</span>
                    </label>
                  );
                })
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  {searchTerm ? 'No teams found matching your search.' : 'No teams available.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;

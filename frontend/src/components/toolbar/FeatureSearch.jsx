import { useState, useRef, useEffect } from 'react';
import { useUIStore, useEditorStore } from '@/store';
import { searchFeatures } from '@/utils/featuresIndex';

export function FeatureSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const { setActiveTab, openDialog } = useUIStore();
  const { editor } = useEditorStore();

  // Update results when query changes
  useEffect(() => {
    const newResults = query.trim() ? searchFeatures(query) : [];
    setResults(newResults);
    setSelectedIndex(0);
    setIsOpen(newResults.length > 0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        handleSelectFeature(results[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
      default:
        break;
    }
  };

  // Handle feature selection
  const handleSelectFeature = (feature) => {
    if (!feature) return;

    // Switch to the feature's tab
    if (feature.tab && feature.tab !== 'file') {
      setActiveTab(feature.tab);
    }

    // Execute action if available
    if (feature.action) {
      feature.action(editor);
    }

    // Open dialog if available
    if (feature.dialog) {
      openDialog(feature.dialog);
    }

    // Reset search
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && 
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Group results by category for display
  const groupedResults = results.reduce((acc, feature) => {
    const category = feature.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {});

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      paddingRight: 8,
    }}>
      {/* Search Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query && results.length > 0 && setIsOpen(true)}
        placeholder="Search features..."
        style={{
          width: '180px',
          height: 24,
          padding: '0 8px',
          borderRadius: 2,
          border: '1px solid var(--border)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          fontSize: 11,
          fontFamily: 'var(--font-ui)',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(201, 168, 76, 0.2)' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--gold)';
          e.currentTarget.style.background = 'var(--bg-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-elevated)';
          }
        }}
      />

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={resultsRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            maxHeight: '320px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(groupedResults).map(([category, items], catIndex) => (
            <div key={category}>
              {catIndex > 0 && (
                <div style={{
                  height: 1,
                  background: 'var(--border)',
                  margin: '4px 0',
                }} />
              )}
              <div style={{
                padding: '6px 8px 2px',
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}>
                {category}
              </div>
              {items.map((feature, idx) => {
                const globalIdx = Object.entries(groupedResults)
                  .flatMap(([, feats]) => feats)
                  .indexOf(feature);
                const isSelected = globalIdx === selectedIndex;

                return (
                  <button
                    key={feature.id}
                    onClick={() => handleSelectFeature(feature)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      textAlign: 'left',
                      border: 'none',
                      background: isSelected ? 'var(--bg-elevated)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--gold)' : '3px solid transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: 11,
                      fontFamily: 'var(--font-ui)',
                      cursor: 'pointer',
                      transition: 'all 0.1s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>
                      <div style={{ fontSize: 11, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {feature.name}
                      </div>
                      {feature.description && (
                        <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 2 }}>
                          {feature.description}
                        </div>
                      )}
                    </span>
                    {feature.tab && (
                      <span style={{
                        fontSize: 8,
                        background: 'var(--gold)',
                        color: 'var(--text-on-gold)',
                        padding: '2px 4px',
                        borderRadius: 2,
                        fontWeight: 600,
                        marginLeft: 8,
                        whiteSpace: 'nowrap',
                      }}>
                        {feature.tab === 'ai' ? 'AI' : feature.tab.charAt(0).toUpperCase() + feature.tab.slice(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Empty state or hint */}
      {query && !isOpen && results.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: '8px',
          fontSize: 11,
          color: 'var(--text-secondary)',
          textAlign: 'center',
        }}>
          No features found
        </div>
      )}
    </div>
  );
}

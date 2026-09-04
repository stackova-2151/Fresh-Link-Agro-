import { useState, useCallback, useRef, useEffect } from 'react';
import type { Client } from '@/lib/types';

export interface UseClientAutocompleteOptions {
  clients: Client[];
  /** Called after a client is confirmed selected. */
  onSelect?: (client: Client) => void;
}

export interface UseClientAutocompleteReturn {
  // Controlled input value
  inputValue: string;
  setInputValue: (v: string) => void;

  // Dropdown state
  suggestions: Client[];
  isOpen: boolean;
  highlightedIndex: number;

  // Selected client (null until one is confirmed)
  selectedClient: Client | null;
  clearSelection: () => void;
  forceSelect: (client: Client) => void;

  // Event handlers — attach directly to the <Input>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
  handleFocus: () => void;

  // Attach to each suggestion <div> — key must be passed separately on the JSX element
  getSuggestionProps: (client: Client, index: number) => {
    className: string;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
  };

  // Ref to attach to the dropdown container for scroll-into-view
  listRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Shared hook for client/customer name autocomplete with full keyboard navigation.
 *
 * Fixes:
 * - highlightedIndex starts at -1 (nothing pre-selected)
 * - First ArrowDown → index 0 (first item), not index 1
 * - ArrowUp at index 0 → stays at 0 (no wrap to last item)
 * - Enter only selects when index >= 0 (never auto-selects first item)
 * - onMouseDown (not onClick) prevents blur from closing dropdown before selection
 * - Active item scrolls into view automatically
 */
export function useClientAutocomplete({
  clients,
  onSelect,
}: UseClientAutocompleteOptions): UseClientAutocompleteReturn {
  const [inputValue, setInputValueState] = useState('');
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll the highlighted item into view whenever the index changes
  useEffect(() => {
    if (!listRef.current || highlightedIndex < 0) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  // Cleanup blur timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  const confirmSelect = useCallback(
    (client: Client) => {
      setSelectedClient(client);
      setInputValueState(client.name);
      setIsOpen(false);
      setSuggestions([]);
      setHighlightedIndex(-1);
      onSelect?.(client);
    },
    [onSelect]
  );

  const setInputValue = useCallback(
    (v: string) => {
      setInputValueState(v);
      setSelectedClient(null);
      if (!v.trim()) {
        setSuggestions([]);
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }
      const results = clients.filter((c) =>
        c.name.toLowerCase().includes(v.toLowerCase())
      );
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(-1); // reset on every text change
    },
    [clients]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    },
    [setInputValue]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        if (!isOpen || suggestions.length === 0) return;
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!isOpen || suggestions.length === 0) return;
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(-1);
        return;
      }

      if (e.key === 'Enter') {
        if (isOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          e.preventDefault();
          confirmSelect(suggestions[highlightedIndex]);
        }
        // If nothing is highlighted, let Enter propagate normally (e.g. form submit)
      }
    },
    [isOpen, suggestions, highlightedIndex, confirmSelect]
  );

  const handleBlur = useCallback(() => {
    // Delay so onMouseDown on a suggestion fires before the dropdown closes
    blurTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  }, []);

  const handleFocus = useCallback(() => {
    // Cancel any pending blur close (e.g. re-focus after clicking inside dropdown)
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (suggestions.length > 0) setIsOpen(true);
  }, [suggestions.length]);

  const clearSelection = useCallback(() => {
    setSelectedClient(null);
    setInputValueState('');
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  /** Directly set a client as selected without going through the suggestion flow.
   * Used when loading an existing voucher where the client is already known. */
  const forceSelect = useCallback((client: Client) => {
    setSelectedClient(client);
    setInputValueState(client.name);
    setSuggestions([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, []);

  const getSuggestionProps = useCallback(
    (client: Client, index: number) => ({
      className: `cursor-pointer px-3 py-2 text-sm ${
        index === highlightedIndex ? 'bg-teal-50 text-teal-800' : 'hover:bg-muted'
      }`,
      onMouseDown: (e: React.MouseEvent) => {
        // Prevent the input's onBlur from firing before we register the selection
        e.preventDefault();
        confirmSelect(client);
      },
      onMouseEnter: () => setHighlightedIndex(index),
    }),
    [highlightedIndex, confirmSelect]
  );

  return {
    inputValue,
    setInputValue,
    suggestions,
    isOpen,
    highlightedIndex,
    selectedClient,
    clearSelection,
    forceSelect,
    handleInputChange,
    handleKeyDown,
    handleBlur,
    handleFocus,
    getSuggestionProps,
    listRef,
  };
}

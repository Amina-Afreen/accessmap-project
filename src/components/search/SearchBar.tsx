import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mic, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoiceAssistant } from "@/lib/voice-assistant";
import { toast } from "sonner";

interface SearchBarProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  initialQuery?: string;
  className?: string;
  expanded?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = "Search location",
  initialQuery = "",
  className = "",
  expanded = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isListening, setIsListening] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    // Close suggestions when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
      setShowSuggestions(false);
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const startVoiceSearch = () => {
    if (isListening) {
      voiceAssistant.stopListening();
      setIsListening(false);
      return;
    }

    setIsListening(true);
    voiceAssistant.speak("What would you like to search for?");
    
    // Register a one-time command handler for the search query
    voiceAssistant.registerCommand("search for", (args) => {
      if (args) {
        setQuery(args);
        setTimeout(() => handleSearch(), 500);
      } else {
        voiceAssistant.speak("I didn't catch that. Please try again.");
      }
      setIsListening(false);
      voiceAssistant.unregisterCommand("search for");
    });
    
    // Also handle direct queries without "search for" prefix
    const handleDirectQuery = (transcript: string) => {
      setQuery(transcript);
      setTimeout(() => handleSearch(), 500);
      setIsListening(false);
      voiceAssistant.unregisterCommand("*");
    };
    voiceAssistant.registerCommand("*", handleDirectQuery);
    
    const success = voiceAssistant.startListening();
    if (!success) {
      toast.error("Voice recognition not available");
      setIsListening(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    // Generate suggestions based on input
    if (value.trim().length > 2) {
      // In a real app, we would fetch suggestions from an API
      // For now, we'll use some mock suggestions
      const mockSuggestions = [
        `${value} Hospital`,
        `${value} Restaurant`,
        `${value} Park`,
        `${value} School`,
        `${value} Shopping Center`
      ];
      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleExpand}
        className={className}
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="flex items-center">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            className="pr-8"
            onFocus={() => {
              if (query.trim().length > 2) {
                setShowSuggestions(true);
              }
            }}
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => {
                setQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
        
        <Button type="submit" size="icon" className="ml-2">
          <Search className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          size="icon"
          variant={isListening ? "default" : "outline"}
          className="ml-2"
          onClick={startVoiceSearch}
        >
          {isListening ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </Button>
        
        {isExpanded && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleExpand}
            className="ml-2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {/* Search suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex items-center"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <Search className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
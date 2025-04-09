import { ArrowLeft, Menu, Mic, Search, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search/SearchBar";
import { VoiceAssistant } from "@/lib/voice-assistant";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showSearch?: boolean;
}

export function Header({ title, showBackButton = false, showSearch = true }: HeaderProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const voiceAssistant = VoiceAssistant.getInstance();

  const goBack = () => {
    navigate(-1);
  };

  // Don't show search on certain pages
  const shouldShowSearch = showSearch && 
    !location.pathname.includes("/navigation") && 
    !location.pathname.includes("/place-details");

  const handleVoiceCommand = () => {
    voiceAssistant.speak("What would you like to do?");
    
    // Register voice commands
    voiceAssistant.registerCommand("search for", (query) => {
      if (query) {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
      voiceAssistant.unregisterCommand("search for");
    });
    
    voiceAssistant.registerCommand("go to", (destination) => {
      if (destination === "map" || destination === "home") {
        navigate("/");
      } else if (destination === "profile") {
        navigate("/profile");
      } else if (destination === "settings") {
        navigate("/settings");
      } else if (destination === "add place") {
        navigate("/add-place");
      } else {
        navigate(`/search?q=${encodeURIComponent(destination || "")}`);
      }
      voiceAssistant.unregisterCommand("go to");
    });
    
    voiceAssistant.startListening();
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center h-14 px-4">
        {showBackButton ? (
          <Button variant="ghost" size="icon" onClick={goBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <Button variant="ghost" size="icon" asChild>
            <Link to="/settings">
              <Menu className="h-5 w-5" />
            </Link>
          </Button>
        )}

        {title && !isSearchActive && (
          <h1 className="text-lg font-medium flex-1 text-center">{title}</h1>
        )}

        {shouldShowSearch && (
          <>
            {isSearchActive ? (
              <div className="flex-1 flex items-center">
                <SearchBar 
                  expanded={true}
                  onSearch={(query) => {
                    navigate(`/search?q=${encodeURIComponent(query)}`);
                  }}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => setIsSearchActive(false)} className="ml-2">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setIsSearchActive(true)}>
                  <Search className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleVoiceCommand}>
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}
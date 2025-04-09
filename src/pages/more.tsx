import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Moon, 
  Bell, 
  Shield, 
  HelpCircle, 
  Info, 
  Share2, 
  Star, 
  MessageSquare,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { VoiceAssistant } from "@/lib/voice-assistant";

const More = () => {
  const [darkMode, setDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    // Announce page
    voiceAssistant.speak("More options page");
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem('theme', 'dark');
      voiceAssistant.speak("Dark mode enabled");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem('theme', 'light');
      voiceAssistant.speak("Dark mode disabled");
    }
  };

  const toggleNotifications = () => {
    const newState = !notifications;
    setNotifications(newState);
    
    if (newState) {
      toast.success("Notifications enabled");
      voiceAssistant.speak("Notifications enabled");
    } else {
      toast.info("Notifications disabled");
      voiceAssistant.speak("Notifications disabled");
    }
  };

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    
    if (newState) {
      voiceAssistant.speak("Voice assistant enabled");
    } else {
      voiceAssistant.speak("Voice assistant disabled");
      // Wait for the announcement to finish before disabling
      setTimeout(() => {
        voiceAssistant.cancelSpeech();
      }, 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AccessMap",
          text: "Check out AccessMap - Navigation for everyone",
          url: window.location.origin,
        });
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      toast.info("Sharing is not supported on this device");
      voiceAssistant.speak("Sharing is not supported on this device");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="More" />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Preferences</h2>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Moon className="h-5 w-5 text-gray-500" />
                <Label htmlFor="dark-mode">Dark Mode</Label>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={toggleDarkMode}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-gray-500" />
                <Label htmlFor="notifications">Notifications</Label>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={toggleNotifications}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {voiceEnabled ? (
                  <Volume2 className="h-5 w-5 text-gray-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-gray-500" />
                )}
                <Label htmlFor="voice-assistant">Voice Assistant</Label>
              </div>
              <Switch
                id="voice-assistant"
                checked={voiceEnabled}
                onCheckedChange={toggleVoice}
              />
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate("/settings");
                voiceAssistant.speak("Settings page");
              }}
            >
              <Settings className="h-5 w-5 mr-2 text-gray-500" />
              Settings
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Support</h2>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate("/help");
                voiceAssistant.speak("Help and frequently asked questions page");
              }}
            >
              <HelpCircle className="h-5 w-5 mr-2 text-gray-500" />
              Help & FAQ
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate("/feedback");
                voiceAssistant.speak("Send feedback page");
              }}
            >
              <MessageSquare className="h-5 w-5 mr-2 text-gray-500" />
              Send Feedback
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate("/privacy");
                voiceAssistant.speak("Privacy policy page");
              }}
            >
              <Shield className="h-5 w-5 mr-2 text-gray-500" />
              Privacy Policy
            </Button>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">About</h2>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                navigate("/about");
                voiceAssistant.speak("About AccessMap page");
              }}
            >
              <Info className="h-5 w-5 mr-2 text-gray-500" />
              About AccessMap
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={handleShare}
            >
              <Share2 className="h-5 w-5 mr-2 text-gray-500" />
              Share AccessMap
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.open("https://play.google.com", "_blank");
                  voiceAssistant.speak("Opening app store");
                }
              }}
            >
              <Star className="h-5 w-5 mr-2 text-gray-500" />
              Rate the App
            </Button>
          </div>
          
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>AccessMap v1.0.0</p>
            <p>© 2023 AccessMap</p>
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default More;
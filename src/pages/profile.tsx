import { useEffect, useState } from "react";
import { fine } from "@/lib/fine";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  User, 
  Settings, 
  LogOut, 
  AccessibilityIcon, 
  Eye, 
  Ear, 
  Brain, 
  Route 
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Schema } from "@/lib/db-types";
import { VoiceAssistant } from "@/lib/voice-assistant";

const Profile = () => {
  const { data: session } = fine.auth.useSession();
  const [preferences, setPreferences] = useState<Schema["userPreferences"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const voiceAssistant = VoiceAssistant.getInstance();

  useEffect(() => {
    const fetchUserPreferences = async () => {
      if (!session?.user?.id) return;
      
      try {
        setIsLoading(true);
        const userPrefs = await fine.table("userPreferences").select().eq("userId", session.user.id);
        
        if (userPrefs && userPrefs.length > 0) {
          setPreferences(userPrefs[0]);
          
          // Apply saved preferences to the app
          applyPreferences(userPrefs[0]);
        } else {
          // Create default preferences if none exist
          const defaultPrefs = {
            userId: session.user.id,
            mobilityAid: null,
            visualNeeds: false,
            hearingNeeds: false,
            cognitiveNeeds: false,
            preferredRouteType: "shortest"
          };
          
          await fine.table("userPreferences").insert(defaultPrefs);
          setPreferences(defaultPrefs);
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserPreferences();
  }, [session]);

  // Apply all preferences at once
  const applyPreferences = (prefs: Schema["userPreferences"]) => {
    // Visual needs
    if (prefs.visualNeeds) {
      document.documentElement.classList.add("high-contrast");
      document.documentElement.style.fontSize = "110%";
      const voiceAssistant = VoiceAssistant.getInstance();
      voiceAssistant.setOptions({ rate: 0.9, volume: 1 });
    } else {
      document.documentElement.classList.remove("high-contrast");
      document.documentElement.style.fontSize = "100%";
      const voiceAssistant = VoiceAssistant.getInstance();
      voiceAssistant.setOptions({ rate: 1, volume: 1 });
    }
    
    // Hearing needs
    if (prefs.hearingNeeds) {
      document.documentElement.classList.add("enhanced-visual-feedback");
    } else {
      document.documentElement.classList.remove("enhanced-visual-feedback");
    }
    
    // Cognitive needs
    if (prefs.cognitiveNeeds) {
      document.documentElement.classList.add("simplified-ui");
    } else {
      document.documentElement.classList.remove("simplified-ui");
    }
  };

  const updatePreference = async (key: keyof Schema["userPreferences"], value: any) => {
    if (!session?.user?.id || !preferences?.id) return;
    
    try {
      const updatedPrefs = { ...preferences, [key]: value };
      setPreferences(updatedPrefs);
      
      await fine.table("userPreferences").update({ [key]: value }).eq("id", preferences.id);
      toast.success("Preferences updated");
      
      // Announce the change
      voiceAssistant.speak(`${key} preference updated`);
      
      // Apply preferences to the app
      applyPreferences(updatedPrefs);
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
    }
  };

  const handleLogout = async () => {
    try {
      voiceAssistant.speak("Signing out");
      await fine.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Header title="Profile" />
      
      <main className="flex-1 pt-14 pb-16 overflow-y-auto">
        <div className="p-4 space-y-6">
          {session?.user ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Manage your account information</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      <User className="h-6 w-6" />
                    </div>
                    
                    <div>
                      <h3 className="font-medium">{session.user.name}</h3>
                      <p className="text-sm text-muted-foreground">{session.user.email}</p>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full mt-4"
                    onClick={() => {
                      navigate("/edit-profile");
                      voiceAssistant.speak("Edit profile page");
                    }}
                  >
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Accessibility Preferences</CardTitle>
                  <CardDescription>Customize your navigation experience</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="animate-pulse space-y-3">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    </div>
                  ) : preferences ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="mobilityAid">Mobility Aid</Label>
                        <Select
                          value={preferences.mobilityAid || "none"}
                          onValueChange={(value) => updatePreference("mobilityAid", value === "none" ? null : value)}
                        >
                          <SelectTrigger id="mobilityAid">
                            <SelectValue placeholder="Select mobility aid" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="wheelchair">Wheelchair</SelectItem>
                            <SelectItem value="walker">Walker</SelectItem>
                            <SelectItem value="cane">Cane</SelectItem>
                            <SelectItem value="crutches">Crutches</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <AccessibilityIcon className="h-4 w-4" />
                            <Label htmlFor="mobilityNeeds">Mobility Needs</Label>
                          </div>
                          <Switch
                            id="mobilityNeeds"
                            checked={!!preferences.mobilityAid}
                            onCheckedChange={(checked) => updatePreference("mobilityAid", checked ? "wheelchair" : null)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <Label htmlFor="visualNeeds">Visual Needs</Label>
                          </div>
                          <Switch
                            id="visualNeeds"
                            checked={preferences.visualNeeds || false}
                            onCheckedChange={(checked) => updatePreference("visualNeeds", checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Ear className="h-4 w-4" />
                            <Label htmlFor="hearingNeeds">Hearing Needs</Label>
                          </div>
                          <Switch
                            id="hearingNeeds"
                            checked={preferences.hearingNeeds || false}
                            onCheckedChange={(checked) => updatePreference("hearingNeeds", checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Brain className="h-4 w-4" />
                            <Label htmlFor="cognitiveNeeds">Cognitive Needs</Label>
                          </div>
                          <Switch
                            id="cognitiveNeeds"
                            checked={preferences.cognitiveNeeds || false}
                            onCheckedChange={(checked) => updatePreference("cognitiveNeeds", checked)}
                          />
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Route className="h-4 w-4" />
                          <Label htmlFor="preferredRouteType">Preferred Route Type</Label>
                        </div>
                        <Select
                          value={preferences.preferredRouteType || "shortest"}
                          onValueChange={(value) => updatePreference("preferredRouteType", value)}
                        >
                          <SelectTrigger id="preferredRouteType">
                            <SelectValue placeholder="Select route type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shortest">Shortest</SelectItem>
                            <SelectItem value="mostAccessible">Most Accessible</SelectItem>
                            <SelectItem value="fewestSteps">Fewest Steps</SelectItem>
                            <SelectItem value="leastCrowded">Least Crowded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Failed to load preferences</p>
                      <Button 
                        variant="outline" 
                        className="mt-2"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    navigate("/settings");
                    voiceAssistant.speak("Settings page");
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold mb-4">Sign in to view your profile</h2>
              <div className="space-x-4">
                <Button onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button variant="outline" onClick={() => navigate("/signup")}>
                  Sign Up
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
};

export default Profile;
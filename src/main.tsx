import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "./components/ui/tooltip";
import { ThemeProvider } from "./components/layout/theme-provider";
import "./index.css";

// Pages
import Index from "./pages";
import LoginForm from "./pages/login";
import SignupForm from "./pages/signup";
import Logout from "./pages/logout";
import PlaceDetails from "./pages/place-details";
import Navigation from "./pages/navigation";
import Profile from "./pages/profile";
import AddPlace from "./pages/add-place";
import AddReview from "./pages/add-review";
import Search from "./pages/search";
import More from "./pages/more";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/place-details/:id" element={<PlaceDetails />} />
            <Route path="/navigation" element={<Navigation />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/add-place" element={<AddPlace />} />
            <Route path="/add-review/:id" element={<AddReview />} />
            <Route path="/search" element={<Search />} />
            <Route path="/more" element={<More />} />
          </Routes>
        </BrowserRouter>
        <Sonner />
        <Toaster />
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
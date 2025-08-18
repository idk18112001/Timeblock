import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const features = [
  {
    title: "Month → Day → Hour",
    subtitle: "No extra buttons. Just click through."
  },
  {
    title: "Notes Drawer",
    subtitle: "Persistent, dynamic, and drag-ready."
  },
  {
    title: "Drag & Drop",
    subtitle: "Drop from notes into dates and time slots."
  },
  {
    title: "Glassmorphism UI",
    subtitle: "Calm. Focused. Futuristic."
  }
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [email, setEmail] = useState("");

  // Auto-advance carousel every 5 seconds
  useState(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  });

  const handleSignUp = () => {
    setLocation("/app");
  };

  const handleGoogleSignUp = () => {
    setLocation("/app");
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-dark-violet via-deep-violet to-royal-purple">
      {/* Left Panel */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="glass-card rounded-3xl p-12 max-w-lg w-full text-center shadow-2xl">
          {/* Logo */}
          <div className="mb-8">
            <h1 className="text-4xl font-maison font-bold bg-gradient-to-r from-electric-violet to-blue-indigo bg-clip-text text-transparent">
              TimeBlock
            </h1>
          </div>
          
          {/* Hero Text */}
          <h2 className="text-3xl font-maison font-semibold mb-8 leading-tight text-white">
            Dump First, Organize Later
          </h2>
          
          {/* Google Sign-Up Button */}
          <Button
            onClick={handleGoogleSignUp}
            className="glass-card w-full py-4 px-6 rounded-xl mb-4 flex items-center justify-center gap-3 hover:bg-white/20 transition-all glow-hover text-white border-white/20"
            variant="outline"
            data-testid="button-google-signup"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-apercu font-medium">Sign up with Google</span>
          </Button>
          
          {/* Email Sign-Up */}
          <div className="mb-6">
            <Input 
              type="email" 
              placeholder="Enter your email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-subtle w-full py-4 px-4 rounded-xl mb-4 bg-transparent placeholder-white/70 border-white/20 focus:border-soft-cyan focus:ring-2 focus:ring-soft-cyan/50 text-white"
              data-testid="input-email"
            />
            <Button 
              onClick={handleSignUp}
              className="gradient-button w-full py-4 px-6 rounded-xl font-apercu font-medium hover:shadow-lg hover:shadow-electric-violet/30 transition-all glow-hover text-white"
              data-testid="button-email-signup"
            >
              Sign Up
            </Button>
          </div>
          
          {/* Sign In Link */}
          <p className="text-white font-apercu">
            Already have an account? {" "}
            <button 
              onClick={() => setLocation("/app")}
              className="text-white hover:text-soft-cyan font-medium underline"
              data-testid="link-signin"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
      
      {/* Right Panel */}
      <div className="w-1/2 flex items-center justify-center p-8">
        <div className="glass-card rounded-3xl p-8 max-w-2xl w-full shadow-2xl">
          {/* Feature Carousel */}
          <div className="relative">
            <div className="carousel-content">
              <div className="carousel-slide">
                <div className="mb-6">
                  <h3 className="text-xl font-maison font-semibold mb-3 text-white">
                    {features[currentSlide].title}
                  </h3>
                  <p className="text-white/80 font-apercu">
                    {features[currentSlide].subtitle}
                  </p>
                </div>
                {/* Mock app screenshot showing month view */}
                <div className="glass-subtle rounded-2xl p-6 shadow-lg">
                  <div className="grid grid-cols-7 gap-2 mb-4">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                      <div key={day} className="text-center text-sm font-apercu font-medium text-white/70">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div 
                        key={i}
                        className={`aspect-square glass-subtle rounded-lg flex items-center justify-center text-sm cursor-pointer hover:bg-white/20 ${
                          i === 2 ? 'ring-2 ring-electric-violet' : ''
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Carousel Controls */}
            <div className="flex justify-center mt-6 gap-2">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-electric-violet' : 'bg-white/30'
                  }`}
                  data-testid={`carousel-dot-${index}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

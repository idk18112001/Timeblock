import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const walkthroughSteps = [
  {
    id: 1,
    title: "Welcome to TimeBlock",
    content: "This is your Month view. Click any date to zoom into the Day.",
    position: { top: "50%", left: "50%" },
  },
  {
    id: 2,
    title: "Your Notes Drawer",
    content: "Your Notes Drawer is always here. Write first, organize later.",
    position: { bottom: "160px", left: "50%" },
  },
  {
    id: 3,
    title: "Drag & Drop",
    content: "Drag a note onto a date to schedule it for that day.",
    position: { top: "50%", left: "50%" },
  },
  {
    id: 4,
    title: "Day View",
    content: "Click a date to see your Day timeline. Drop tasks into hours to set times.",
    position: { top: "50%", left: "50%" },
  },
  {
    id: 5,
    title: "Hour View",
    content: "Click an hour to fine-tune in 15-minute blocks. Precise and fast.",
    position: { top: "50%", left: "50%" },
  },
];

interface WalkthroughProps {
  onComplete: () => void;
}

export default function Walkthrough({ onComplete }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = walkthroughSteps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      data-testid="walkthrough-overlay"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={step.position}
        >
          <div className="glass-card rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <h3 className="text-xl font-maison font-semibold mb-4 text-white">
              {step.title}
            </h3>
            <p className="font-apercu text-white/80 mb-6">
              {step.content}
            </p>
            
            <div className="flex gap-3 justify-center">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="px-6 py-3 text-white/70 hover:text-white transition-colors font-apercu"
                  data-testid="button-walkthrough-back"
                >
                  Back
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="px-6 py-3 text-white/70 hover:text-white transition-colors font-apercu"
                data-testid="button-walkthrough-skip"
              >
                Skip
              </Button>
              
              <Button
                onClick={handleNext}
                className="gradient-button px-6 py-3 rounded-lg font-apercu font-medium glow-hover text-white"
                data-testid="button-walkthrough-next"
              >
                {currentStep === walkthroughSteps.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
            
            {/* Progress indicator */}
            <div className="flex justify-center mt-6 gap-2">
              {walkthroughSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep ? "bg-electric-violet" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
      
      {/* Pointer arrow for specific steps */}
      {step.id === 2 && (
        <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2">
          <svg className="w-6 h-6 text-soft-cyan animate-bounce" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd"></path>
          </svg>
        </div>
      )}
    </motion.div>
  );
}

import { useState, useEffect } from "react";

export function useWalkthrough() {
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(false);

  useEffect(() => {
    const hasSeenWalkthrough = localStorage.getItem('timeblock_walkthrough_done');
    if (!hasSeenWalkthrough) {
      setTimeout(() => {
        setIsWalkthroughActive(true);
      }, 500);
    }
  }, []);

  const startWalkthrough = () => {
    setIsWalkthroughActive(true);
  };

  const completeWalkthrough = () => {
    localStorage.setItem('timeblock_walkthrough_done', 'true');
    setIsWalkthroughActive(false);
  };

  return {
    isWalkthroughActive,
    startWalkthrough,
    completeWalkthrough,
  };
}

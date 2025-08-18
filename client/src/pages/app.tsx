import { useState } from "react";
import { Button } from "@/components/ui/button";
import MonthView from "@/components/month-view";
import DayView from "@/components/day-view";
import HourView from "@/components/hour-view";
import NotesDrawer from "@/components/notes-drawer";
import Walkthrough from "@/components/walkthrough";
import { useWalkthrough } from "@/hooks/use-walkthrough";
import { formatDate, formatMonthYear } from "@/lib/date-utils";
import { HelpCircle, User, ChevronLeft, ChevronRight } from "lucide-react";

type ViewMode = "month" | "day" | "hour";

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  
  const { isWalkthroughActive, startWalkthrough, completeWalkthrough } = useWalkthrough();

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("day");
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    setViewMode("hour");
  };

  const handleCloseDayView = () => {
    setViewMode("month");
    setSelectedDate(null);
  };

  const handleCloseHourView = () => {
    setViewMode("day");
    setSelectedHour(null);
  };

  const handleMonthChange = (date: Date) => {
    setCurrentDate(date);
  };

  const getCurrentViewTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString("en-US", { month: "long" });
    }
    if (viewMode === "day" && selectedDate) {
      return formatDate(selectedDate);
    }
    if (viewMode === "hour" && selectedDate && selectedHour !== null) {
      return `${formatDate(selectedDate)} • ${selectedHour.toString().padStart(2, '0')}:00–${selectedHour.toString().padStart(2, '0')}:59`;
    }
    return "";
  };

  const getCurrentViewSubtitle = () => {
    if (viewMode === "month") return currentDate.getFullYear().toString();
    if (viewMode === "day") return "Day";
    if (viewMode === "hour") return "Hour";
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-violet via-deep-violet to-royal-purple">
      {/* Header */}
      <header className="glass-card border-b border-white/10 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-maison font-bold bg-gradient-to-r from-electric-violet to-blue-indigo bg-clip-text text-transparent">
            TimeBlock
          </h1>
        </div>
        
        <div className="flex items-center gap-6 text-center">
          <div className="flex items-center gap-4">
            {viewMode === "month" && (
              <>
                <Button
                  onClick={() => {
                    const prevMonth = new Date(currentDate);
                    prevMonth.setMonth(prevMonth.getMonth() - 1);
                    handleMonthChange(prevMonth);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0"
                  data-testid="button-previous-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </>
            )}
            
            <div>
              <h2 className="text-lg font-maison font-semibold text-white" data-testid="text-view-title">
                {getCurrentViewTitle()}
              </h2>
              <p className="text-sm text-white/70 font-apercu" data-testid="text-view-subtitle">
                {getCurrentViewSubtitle()}
              </p>
            </div>
            
            {viewMode === "month" && (
              <>
                <Button
                  onClick={() => {
                    const nextMonth = new Date(currentDate);
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    handleMonthChange(nextMonth);
                  }}
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 p-0"
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={startWalkthrough}
            className="text-white/70 hover:text-soft-cyan transition-colors p-2"
            data-testid="button-help"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 glass-subtle rounded-full flex items-center justify-center p-0"
            data-testid="button-user-menu"
          >
            <User className="w-4 h-4 text-white" />
          </Button>
        </div>
      </header>
      
      {/* Main Content Area */}
      <main className="flex-1 p-6" style={{ height: "calc(100vh - 80px)" }}>
        {viewMode === "month" && (
          <MonthView 
            currentDate={currentDate}
            onDateClick={handleDateClick}
            onMonthChange={handleMonthChange}
          />
        )}
      </main>
      
      {/* Day View Overlay */}
      {viewMode === "day" && selectedDate && (
        <DayView 
          date={selectedDate}
          onClose={handleCloseDayView}
          onHourClick={handleHourClick}
        />
      )}
      
      {/* Hour View Overlay */}
      {viewMode === "hour" && selectedDate && selectedHour !== null && (
        <HourView 
          date={selectedDate}
          hour={selectedHour}
          onClose={handleCloseHourView}
        />
      )}
      
      {/* Persistent Notes Drawer */}
      <NotesDrawer />
      
      {/* Guided Walkthrough */}
      {isWalkthroughActive && (
        <Walkthrough onComplete={completeWalkthrough} />
      )}
    </div>
  );
}

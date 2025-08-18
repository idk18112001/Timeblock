import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { getDaysInMonth, isSameMonth, formatDateString } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Note, Task } from "@shared/schema";

interface MonthViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
  onMonthChange: (date: Date) => void;
}

export default function MonthView({ currentDate, onDateClick, onMonthChange }: MonthViewProps) {
  const days = getDaysInMonth(currentDate);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragOver, handleDragLeave, handleDrop } = useDragDrop();

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { noteId?: string; title: string; description?: string; priority: string; date: string; startTime?: string | null; duration?: number | null }) => {
      const res = await apiRequest("POST", "/api/tasks", taskData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const getTasksForDate = (date: Date): Task[] => {
    const dateString = formatDateString(date);
    return tasks.filter((task: Task) => task.date === dateString);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-400";
      case "low": return "bg-green-400";
      default: return "bg-electric-violet";
    }
  };

  const handleNoteDrop = (date: Date, note: Note) => {
    const dateString = formatDateString(date);
    
    // Create task without specific time - will appear in unscheduled section of day view
    createTaskMutation.mutate({
      noteId: note.id,
      title: note.title,
      description: note.description || undefined,
      priority: note.priority,
      date: dateString,
      startTime: null, // No specific time, will appear in unscheduled section
      duration: null,
    });

    // Remove note from drawer
    deleteNoteMutation.mutate(note.id);
    
    toast({
      title: "Task scheduled",
      description: `Scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
    });
  };

  const handlePreviousMonth = () => {
    const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    onMonthChange(nextMonth);
  };

  return (
    <div className="h-full relative">
      <div className="glass-card rounded-2xl p-6 h-full shadow-xl">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-4 mb-4 pb-4 border-b border-white/10">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center font-apercu font-medium text-white/70">
              {day}
            </div>
          ))}
        </div>
      
      {/* Month Navigation Arrows */}
      <Button
        onClick={handlePreviousMonth}
        variant="ghost"
        size="sm"
        className="absolute left-2 top-1/2 transform -translate-y-1/2 z-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
        data-testid="button-previous-month"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      
      <Button
        onClick={handleNextMonth}
        variant="ghost"
        size="sm"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 z-10 text-white/70 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
        data-testid="button-next-month"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
        
        {/* Calendar Grid - Force 6 rows */}
        <div 
          className="grid grid-cols-7 gap-4 h-5/6"
          style={{ gridTemplateRows: 'repeat(6, 1fr)' }}
        >
          {days.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toISOString()}
                className={`day-cell glass-subtle rounded-xl p-3 cursor-pointer hover:bg-white/20 hover:shadow-lg transition-all relative flex flex-col ${
                  !isCurrentMonth ? "opacity-50" : ""
                }`}
                onClick={() => onDateClick(day)}
                onDragOver={(e) => handleDragOver(e.nativeEvent)}
                onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                onDrop={(e) => handleDrop(e.nativeEvent, (note) => handleNoteDrop(day, note))}
                data-drop-zone={`day-${formatDateString(day)}`}
                data-testid={`day-cell-${formatDateString(day)}`}
              >
                <div className="text-right mb-auto">
                  <span className="text-sm font-apercu text-white/90">
                    {day.getDate()}
                  </span>
                </div>
                
                <div className="mt-auto space-y-1">
                  {dayTasks.slice(0, 3).map((task: Task, index) => (
                    <div
                      key={task.id}
                      className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
                      title={task.title}
                    />
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-white/60 font-apercu">
                      +{dayTasks.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { getDaysInMonth, isSameMonth, formatDateString } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note, Task } from "@shared/schema";

interface MonthViewProps {
  currentDate: Date;
  onDateClick: (date: Date) => void;
}

export default function MonthView({ currentDate, onDateClick }: MonthViewProps) {
  const days = getDaysInMonth(currentDate);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragOver, handleDragLeave, handleDrop } = useDragDrop();

  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { noteId?: string; title: string; description?: string; priority: string; date: string }) => {
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
    
    createTaskMutation.mutate({
      noteId: note.id,
      title: note.title,
      description: note.description || undefined,
      priority: note.priority,
      date: dateString,
    });

    // Remove note from drawer
    deleteNoteMutation.mutate(note.id);
    
    toast({
      title: "Task scheduled",
      description: `Scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
    });
  };

  return (
    <div className="h-full">
      <div className="glass-card rounded-2xl p-6 h-full shadow-xl">
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-4 mb-4 pb-4 border-b border-white/10">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-center font-apercu font-medium text-white/70">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-4 h-5/6">
          {days.map((day) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            
            return (
              <div
                key={day.toISOString()}
                className={`day-cell glass-subtle rounded-xl p-3 cursor-pointer hover:bg-white/20 hover:shadow-lg transition-all min-h-24 relative ${
                  !isCurrentMonth ? "opacity-50" : ""
                }`}
                onClick={() => onDateClick(day)}
                onDragOver={(e) => handleDragOver(e.nativeEvent)}
                onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                onDrop={(e) => handleDrop(e.nativeEvent, (note) => handleNoteDrop(day, note))}
                data-drop-zone={`day-${formatDateString(day)}`}
                data-testid={`day-cell-${formatDateString(day)}`}
              >
                <div className="absolute top-2 right-2 text-sm font-apercu text-white/90">
                  {day.getDate()}
                </div>
                
                <div className="mt-6 space-y-1">
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
        
        {/* Empty State */}
        {tasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-white/60">
              <p className="font-apercu text-lg">Pull up your Notes Drawer and drop your first task.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

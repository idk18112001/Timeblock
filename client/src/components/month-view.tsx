import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { getDaysInMonth, isSameMonth, formatDateString } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note, Task } from "@shared/schema";

// Mock localStorage functions for tasks
const mockTasksApi = {
  async getTasks(): Promise<Task[]> {
    const stored = localStorage.getItem('timeBlocker_tasks');
    return stored ? JSON.parse(stored) : [];
  },
  
  async createTask(task: any): Promise<Task> {
    const tasks = await this.getTasks();
    const newTask: Task = {
      id: Date.now().toString(),
      ...task,
      userId: 'demo-user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tasks.push(newTask);
    localStorage.setItem('timeBlocker_tasks', JSON.stringify(tasks));
    return newTask;
  }
};

const mockNotesApi = {
  async deleteNote(id: string): Promise<void> {
    const stored = localStorage.getItem('timeBlocker_notes');
    if (stored) {
      const notes = JSON.parse(stored);
      const filtered = notes.filter((n: any) => n.id !== id);
      localStorage.setItem('timeBlocker_notes', JSON.stringify(filtered));
    }
  }
};

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
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/tasks", undefined);
        return res.json();
      } catch (error) {
        console.warn('API not available, using localStorage for tasks:', error);
        return mockTasksApi.getTasks();
      }
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: { noteId?: string; title: string; description?: string; priority: string; date: string; startTime?: string | null; duration?: number | null }) => {
      try {
        const res = await apiRequest("POST", "/api/tasks", taskData);
        return res.json();
      } catch (error) {
        console.warn('API not available, using localStorage for task creation:', error);
        return mockTasksApi.createTask(taskData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiRequest("DELETE", `/api/notes/${id}`);
      } catch (error) {
        console.warn('API not available, using localStorage for note deletion:', error);
        await mockNotesApi.deleteNote(id);
      }
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
    
    console.log('Dropping note:', note.title, 'on date:', dateString);
    
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
    console.log('Deleting note with ID:', note.id);
    deleteNoteMutation.mutate(note.id);
    
    toast({
      title: "Task scheduled",
      description: `Scheduled for ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
    });
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

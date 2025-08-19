import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { formatDate, formatDateString, getQuarterHours } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Note, Task } from "@shared/schema";

// Mock localStorage functions for tasks - same as month and day view
const mockTasksApi = {
  async getTasks(): Promise<Task[]> {
    const stored = localStorage.getItem('timeBlocker_tasks');
    const tasks = stored ? JSON.parse(stored) : [];
    return tasks;
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

interface HourViewProps {
  date: Date;
  hour: number;
  onClose: () => void;
}

export default function HourView({ date, hour, onClose }: HourViewProps) {
  const [currentHour, setCurrentHour] = useState(hour);
  const quarters = getQuarterHours(currentHour);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragOver, handleDragLeave, handleDrop } = useDragDrop();

  const dateString = formatDateString(date);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { date: dateString }],
    queryFn: async (): Promise<Task[]> => {
      try {
        const response = await apiRequest("GET", "/api/tasks", undefined);
        const data = await response.json();
        return data as Task[];
      } catch (error) {
        console.log("API failed, using localStorage fallback for tasks in hour view");
        const allTasks = await mockTasksApi.getTasks();
        // Filter tasks for this specific date
        const filteredTasks = allTasks.filter(task => {
          if (!task.date) return false;
          const taskDate = new Date(task.date);
          return formatDateString(taskDate) === dateString;
        });
        console.log("Hour view filtered tasks:", filteredTasks);
        return filteredTasks;
      }
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      try {
        const res = await apiRequest("POST", "/api/tasks", taskData);
        return res.json();
      } catch (error) {
        console.log("API failed, using localStorage fallback for task creation in hour view");
        return await mockTasksApi.createTask(taskData);
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
        console.log("API failed, using localStorage fallback for note deletion in hour view");
        await mockNotesApi.deleteNote(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handlePreviousHour = () => {
    setCurrentHour(Math.max(0, currentHour - 1));
  };

  const handleNextHour = () => {
    setCurrentHour(Math.min(23, currentHour + 1));
  };

  const handleNoteDrop = (quarterIndex: number, note: Note) => {
    const minutes = quarterIndex * 15;
    const startTime = `${currentHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    createTaskMutation.mutate({
      noteId: note.id,
      title: note.title,
      description: note.description || undefined,
      priority: note.priority,
      date: dateString,
      startTime,
      duration: 15,
    });

    deleteNoteMutation.mutate(note.id);
    
    toast({
      title: "Task scheduled",
      description: `Task scheduled at ${startTime}.`,
    });
  };

  const getTaskForQuarter = (quarterIndex: number): Task | undefined => {
    const minutes = quarterIndex * 15;
    const timeString = `${currentHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    return tasks.find((task: Task) => task.startTime === timeString);
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "priority-medium";
    }
  };

  const formatHourDisplay = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour} ${period}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      data-testid="hour-view-overlay"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute inset-8 glass-card rounded-3xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <Button
            variant="ghost"
            onClick={handlePreviousHour}
            disabled={currentHour === 0}
            className="flex items-center gap-2 text-white/70 hover:text-soft-cyan transition-colors disabled:opacity-30"
            data-testid="button-previous-hour"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-apercu">{formatHourDisplay(currentHour - 1)}</span>
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-maison font-semibold text-white" data-testid="text-hour-title">
              {formatDate(date)} • {currentHour.toString().padStart(2, '0')}:00–{currentHour.toString().padStart(2, '0')}:59
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleNextHour}
              disabled={currentHour === 23}
              className="flex items-center gap-2 text-white/70 hover:text-soft-cyan transition-colors disabled:opacity-30"
              data-testid="button-next-hour"
            >
              <span className="font-apercu">{formatHourDisplay(currentHour + 1)}</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-2"
              data-testid="button-close-hour-view"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        {/* Hour Content */}
        <div className="flex-1 p-8">
          {/* 15-minute segments */}
          <div className="grid grid-cols-4 gap-6 h-full">
            {quarters.map((quarterTime, index) => {
              const task = getTaskForQuarter(index);
              
              return (
                <div
                  key={quarterTime}
                  className="quarter-segment glass-subtle rounded-xl p-6 cursor-pointer hover:bg-white/20 transition-all flex flex-col"
                  onDragOver={(e) => handleDragOver(e.nativeEvent)}
                  onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                  onDrop={(e) => handleDrop(e.nativeEvent, (note) => handleNoteDrop(index, note))}
                  data-drop-zone={`quarter-${index}`}
                  data-testid={`quarter-segment-${index}`}
                >
                  <div className="text-center mb-4">
                    <span className="text-lg font-apercu font-medium text-white">
                      {quarterTime}
                    </span>
                    <div className="text-sm text-white/60 font-apercu">15 min</div>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    {task ? (
                      <div className="task-block rounded-lg p-4 w-full shadow-lg">
                        <div className="text-center">
                          <h4 className="font-apercu font-medium text-white text-sm mb-1">
                            {task.title}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full font-apercu ${getPriorityClasses(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-white/40 font-apercu text-sm text-center">
                        Drop task here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { formatDate, formatDateString, formatTime, getHoursArray } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Note, Task } from "@shared/schema";

// Mock localStorage functions for tasks - same as month view
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

interface DayViewProps {
  date: Date;
  onClose: () => void;
  onHourClick: (hour: number) => void;
}

export default function DayView({ date, onClose, onHourClick }: DayViewProps) {
  const [currentDate, setCurrentDate] = useState(date);
  const hours = getHoursArray();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragOver, handleDragLeave, handleDrop } = useDragDrop();

  const dateString = formatDateString(currentDate);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { date: dateString }],
    queryFn: async (): Promise<Task[]> => {
      try {
        const response = await apiRequest("GET", "/api/tasks", undefined);
        const data = await response.json();
        return data as Task[];
      } catch (error) {
        console.log("API failed, using localStorage fallback for tasks in day view");
        const allTasks = await mockTasksApi.getTasks();
        // Filter tasks for this specific date
        const filteredTasks = allTasks.filter(task => {
          if (!task.date) return false;
          const taskDate = new Date(task.date);
          return formatDateString(taskDate) === dateString;
        });
        console.log("Day view filtered tasks:", filteredTasks);
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
        console.log("API failed, using localStorage fallback for task creation in day view");
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
        console.log("API failed, using localStorage fallback for note deletion in day view");
        await mockNotesApi.deleteNote(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handlePreviousDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };

  const handleNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    setCurrentDate(nextDay);
  };

  const handleNoteDrop = (hour: number, note: Note) => {
    const startTime = `${hour.toString().padStart(2, '0')}:00`;
    
    createTaskMutation.mutate({
      noteId: note.id,
      title: note.title,
      description: note.description || undefined,
      priority: note.priority,
      date: dateString,
      startTime,
      duration: 60, // Default 1 hour, will appear in first quarter of hour view
    });

    deleteNoteMutation.mutate(note.id);
    
    toast({
      title: "Task scheduled",
      description: `Task scheduled at ${formatTime(hour)}.`,
    });
  };

  const unscheduledTasks = tasks.filter((task: Task) => !task.startTime);
  const scheduledTasks = tasks.filter((task: Task) => task.startTime);

  const getTasksForHour = (hour: number): Task[] => {
    return scheduledTasks.filter((task: Task) => {
      if (!task.startTime) return false;
      const taskHour = parseInt(task.startTime.split(':')[0]);
      return taskHour === hour;
    });
  };

  const getPriorityClasses = (priority: string) => {
    switch (priority) {
      case "high": return "priority-high";
      case "medium": return "priority-medium";
      case "low": return "priority-low";
      default: return "priority-medium";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40"
      data-testid="day-view-overlay"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="absolute inset-4 glass-card rounded-3xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <Button
            variant="ghost"
            onClick={handlePreviousDay}
            className="flex items-center gap-2 text-white/70 hover:text-soft-cyan transition-colors"
            data-testid="button-previous-day"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="font-apercu">
              {new Date(currentDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-maison font-semibold text-white" data-testid="text-day-title">
              {formatDate(currentDate)}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleNextDay}
              className="flex items-center gap-2 text-white/70 hover:text-soft-cyan transition-colors"
              data-testid="button-next-day"
            >
              <span className="font-apercu">
                {new Date(currentDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-2"
              data-testid="button-close-day-view"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>
        
        {/* Day Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Unscheduled Tasks */}
          {unscheduledTasks.length > 0 && (
            <div className="mb-6">
              <h3 className="font-apercu font-medium text-white/70 mb-3">Unscheduled</h3>
              <div className="flex gap-2 flex-wrap">
                {unscheduledTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    className="glass-subtle rounded-lg px-4 py-2 cursor-grab hover:bg-white/20"
                    draggable
                    data-testid={`unscheduled-task-${task.id}`}
                  >
                    <span className="font-apercu text-white">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Timeline */}
          <div className="space-y-1">
            {hours.map((hour) => {
              const hourTasks = getTasksForHour(hour);
              
              return (
                <div
                  key={hour}
                  className="hour-row flex min-h-16 cursor-pointer hover:bg-white/5 rounded-lg transition-all"
                  onClick={() => onHourClick(hour)}
                  onDragOver={(e) => handleDragOver(e.nativeEvent)}
                  onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                  onDrop={(e) => handleDrop(e.nativeEvent, (note) => handleNoteDrop(hour, note))}
                  data-drop-zone={`hour-${hour}`}
                  data-testid={`hour-row-${hour}`}
                >
                  <div className="w-20 flex-shrink-0 text-right pr-4 py-2">
                    <span className="text-sm font-apercu text-white/60">
                      {formatTime(hour)}
                    </span>
                  </div>
                  <div className="flex-1 border-l border-white/10 pl-4 py-2 relative">
                    {hourTasks.map((task: Task) => (
                      <div key={task.id} className="task-block rounded-lg p-3 mb-2 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-apercu font-medium text-white">
                              {task.title}
                            </h4>
                            <p className="text-sm text-white/60 font-apercu">
                              {task.startTime} - {task.duration && task.startTime ? 
                                `${parseInt(task.startTime.split(':')[0]) + Math.floor(task.duration / 60)}:${((parseInt(task.startTime.split(':')[1]) + task.duration % 60) % 60).toString().padStart(2, '0')}` : 
                                task.startTime}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full font-apercu ${getPriorityClasses(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                    
                    {hourTasks.length === 0 && (
                      <div className="h-12 flex items-center text-white/30 font-apercu text-sm">
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

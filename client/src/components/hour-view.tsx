import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { formatDate, formatDateString, getQuarterHours } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X, Edit2, Check, Trash2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  },

  async updateTask(id: string, updates: any): Promise<Task> {
    const tasks = await this.getTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error('Task not found');
    
    const updatedTask = { ...tasks[taskIndex], ...updates, updatedAt: new Date() };
    tasks[taskIndex] = updatedTask;
    localStorage.setItem('timeBlocker_tasks', JSON.stringify(tasks));
    return updatedTask;
  },

  async deleteTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const filtered = tasks.filter(t => t.id !== id);
    localStorage.setItem('timeBlocker_tasks', JSON.stringify(filtered));
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
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      try {
        const res = await apiRequest("PUT", `/api/tasks/${id}`, updates);
        return res.json();
      } catch (error) {
        console.log("API failed, using localStorage fallback for task update in hour view");
        return await mockTasksApi.updateTask(id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingTask(null);
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiRequest("DELETE", `/api/tasks/${id}`);
      } catch (error) {
        console.log("API failed, using localStorage fallback for task deletion in hour view");
        await mockTasksApi.deleteTask(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
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

  const handleTaskSchedule = async (task: Task, quarterIndex: number) => {
    const minutes = quarterIndex * 15;
    const startTime = `${currentHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    
    const updates = {
      startTime,
      duration: 15,
    };

    updateTaskMutation.mutate({ id: task.id, updates });

    toast({
      title: "Task scheduled",
      description: `Task moved to ${startTime}.`,
    });
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task.id);
    setEditForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
    });
  };

  const handleTaskUpdate = () => {
    if (!editingTask) return;
    updateTaskMutation.mutate({ 
      id: editingTask, 
      updates: editForm 
    });
  };

  const handleTaskComplete = (task: Task) => {
    const updates = {
      completed: task.completed === 1 ? 0 : 1,
    };
    updateTaskMutation.mutate({ id: task.id, updates });
  };

  const handleTaskDelete = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  // Task drag handlers
  const handleTaskDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleTaskDragEnd = () => {
    setDraggedTask(null);
  };

  const handleTaskDrop = (e: React.DragEvent, quarterIndex: number) => {
    e.preventDefault();
    if (draggedTask) {
      handleTaskSchedule(draggedTask, quarterIndex);
      setDraggedTask(null);
    }
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
                  onDragOver={(e) => {
                    handleDragOver(e.nativeEvent);
                    e.preventDefault();
                  }}
                  onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedTask) {
                      handleTaskDrop(e, index);
                    } else {
                      handleDrop(e.nativeEvent, (note) => handleNoteDrop(index, note));
                    }
                  }}
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
                      <AnimatePresence>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`task-block rounded-lg p-4 w-full shadow-lg group cursor-grab relative ${
                            task.completed === 1 ? 'opacity-60' : ''
                          }`}
                          draggable
                          onDragStart={(e: any) => {
                            e.stopPropagation();
                            if (e.dataTransfer) {
                              handleTaskDragStart(e, task);
                            }
                          }}
                          onDragEnd={handleTaskDragEnd}
                        >
                          {editingTask === task.id ? (
                            <div className="space-y-2">
                              <Input
                                value={editForm.title}
                                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                className="text-sm text-center"
                                placeholder="Task title"
                              />
                              <Textarea
                                value={editForm.description}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="text-sm"
                                placeholder="Description"
                                rows={2}
                              />
                              <Select
                                value={editForm.priority}
                                onValueChange={(value: 'low' | 'medium' | 'high') => 
                                  setEditForm({ ...editForm, priority: value })
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-1 justify-center">
                                <Button size="sm" onClick={handleTaskUpdate} className="text-xs">
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTask(null)} className="text-xs">
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1 mb-2">
                                  <GripVertical className="w-3 h-3 text-white/40" />
                                  <h4 className={`font-apercu font-medium text-white text-sm ${
                                    task.completed === 1 ? 'line-through' : ''
                                  }`}>
                                    {task.title}
                                  </h4>
                                </div>
                                {task.description && (
                                  <p className="text-xs text-white/60 font-apercu mb-2">
                                    {task.description}
                                  </p>
                                )}
                                <span className={`px-2 py-1 text-xs rounded-full font-apercu ${getPriorityClasses(task.priority)}`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </div>
                              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskComplete(task);
                                  }}
                                  className="h-5 w-5 p-0 hover:bg-green-500/20"
                                >
                                  <Check className="w-2.5 h-2.5 text-green-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskEdit(task);
                                  }}
                                  className="h-5 w-5 p-0 hover:bg-blue-500/20"
                                >
                                  <Edit2 className="w-2.5 h-2.5 text-blue-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskDelete(task.id);
                                  }}
                                  className="h-5 w-5 p-0 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                </Button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <div className="text-white/40 font-apercu text-sm text-center">
                        {draggedTask ? 'Drop task here' : 'Drop task here'}
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

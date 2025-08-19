import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { formatDate, formatDateString, formatTime, getHoursArray } from "@/lib/date-utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X, Edit2, Check, Trash2, GripVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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

interface DayViewProps {
  date: Date;
  onClose: () => void;
  onHourClick: (hour: number) => void;
}

export default function DayView({ date, onClose, onHourClick }: DayViewProps) {
  const [currentDate, setCurrentDate] = useState(date);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

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

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      try {
        const res = await apiRequest("PUT", `/api/tasks/${id}`, updates);
        return res.json();
      } catch (error) {
        console.log("API failed, using localStorage fallback for task update in day view");
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
        console.log("API failed, using localStorage fallback for task deletion in day view");
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

    const handleNoteDrop = async (hour: number, note: Note) => {
    console.log("Creating task from dropped note:", note);
    
    const taskData = {
      title: note.title,
      description: note.description || '',
      priority: note.priority || 'medium',
      date: formatDateString(currentDate),
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: 60,
      noteId: note.id,
      completed: 0,
    };

    createTaskMutation.mutate(taskData);
    deleteNoteMutation.mutate(note.id);

    toast({
      title: "Task scheduled",
      description: `Task scheduled at ${formatTime(hour)}.`,
    });
  };

  const handleTaskSchedule = async (task: Task, hour: number) => {
    const updates = {
      startTime: `${hour.toString().padStart(2, '0')}:00`,
      duration: task.duration || 60,
    };

    updateTaskMutation.mutate({ id: task.id, updates });

    toast({
      title: "Task scheduled",
      description: `Task moved to ${formatTime(hour)}.`,
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

  const handleTaskDrop = (e: React.DragEvent, targetHour: number) => {
    e.preventDefault();
    if (draggedTask) {
      handleTaskSchedule(draggedTask, targetHour);
      setDraggedTask(null);
    }
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
                    className={`glass-subtle rounded-lg px-4 py-2 cursor-grab hover:bg-white/20 relative group transition-all ${
                      task.completed === 1 ? 'opacity-60 line-through' : ''
                    }`}
                    draggable
                    onDragStart={(e: any) => {
                      e.stopPropagation();
                      if (e.dataTransfer) {
                        handleTaskDragStart(e, task);
                      }
                    }}
                    onDragEnd={handleTaskDragEnd}
                    data-testid={`unscheduled-task-${task.id}`}
                  >
                    {editingTask === task.id ? (
                      <div className="min-w-64 space-y-2">
                        <Input
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="text-sm"
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
                        <div className="flex gap-1">
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
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-3 h-3 text-white/40" />
                          <span className="font-apercu text-white text-sm">{task.title}</span>
                          <span className={`px-1.5 py-0.5 text-xs rounded-full font-apercu ${getPriorityClasses(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase()}
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
                            className="h-6 w-6 p-0 hover:bg-green-500/20"
                          >
                            <Check className="w-3 h-3 text-green-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskEdit(task);
                            }}
                            className="h-6 w-6 p-0 hover:bg-blue-500/20"
                          >
                            <Edit2 className="w-3 h-3 text-blue-400" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTaskDelete(task.id);
                            }}
                            className="h-6 w-6 p-0 hover:bg-red-500/20"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </Button>
                        </div>
                      </>
                    )}
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
                  onDragOver={(e) => {
                    handleDragOver(e.nativeEvent);
                    e.preventDefault();
                  }}
                  onDragLeave={(e) => handleDragLeave(e.nativeEvent)}
                  onDrop={(e) => {
                    e.preventDefault();
                    // Handle both note drops and task drops
                    if (draggedTask) {
                      handleTaskDrop(e, hour);
                    } else {
                      handleDrop(e.nativeEvent, (note) => handleNoteDrop(hour, note));
                    }
                  }}
                  data-drop-zone={`hour-${hour}`}
                  data-testid={`hour-row-${hour}`}
                >
                  <div className="w-20 flex-shrink-0 text-right pr-4 py-2">
                    <span className="text-sm font-apercu text-white/60">
                      {formatTime(hour)}
                    </span>
                  </div>
                  <div className="flex-1 border-l border-white/10 pl-4 py-2 relative">
                    <AnimatePresence>
                      {hourTasks.map((task: Task) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`task-block rounded-lg p-3 mb-2 shadow-lg group cursor-grab relative ${
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
                                className="text-sm"
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
                              <div className="flex gap-1">
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
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <GripVertical className="w-3 h-3 text-white/40" />
                                  <div className="flex-1">
                                    <h4 className={`font-apercu font-medium text-white ${
                                      task.completed === 1 ? 'line-through' : ''
                                    }`}>
                                      {task.title}
                                    </h4>
                                    <p className="text-sm text-white/60 font-apercu">
                                      {task.startTime} - {task.duration && task.startTime ? 
                                        `${parseInt(task.startTime.split(':')[0]) + Math.floor(task.duration / 60)}:${((parseInt(task.startTime.split(':')[1]) + task.duration % 60) % 60).toString().padStart(2, '0')}` : 
                                        task.startTime}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-white/50 font-apercu mt-1">
                                        {task.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className={`px-2 py-1 text-xs rounded-full font-apercu ${getPriorityClasses(task.priority)}`}>
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </div>
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskComplete(task);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-green-500/20"
                                >
                                  <Check className="w-3 h-3 text-green-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskEdit(task);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-blue-500/20"
                                >
                                  <Edit2 className="w-3 h-3 text-blue-400" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTaskDelete(task.id);
                                  }}
                                  className="h-6 w-6 p-0 hover:bg-red-500/20"
                                >
                                  <Trash2 className="w-3 h-3 text-red-400" />
                                </Button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {hourTasks.length === 0 && (
                      <div className="h-12 flex items-center text-white/30 font-apercu text-sm">
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

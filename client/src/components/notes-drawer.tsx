import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useDragDrop } from "@/hooks/use-drag-drop";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import type { Note, InsertNote } from "@shared/schema";

// Mock localStorage functions for development
const mockNotesApi = {
  async getNotes(): Promise<Note[]> {
    const stored = localStorage.getItem('timeBlocker_notes');
    const notes = stored ? JSON.parse(stored) : [];
    return notes;
  },
  
  async createNote(note: InsertNote): Promise<Note> {
    const notes = await this.getNotes();
    const newNote: Note = {
      id: Date.now().toString(),
      userId: 'demo-user',
      title: note.title,
      description: note.description || null,
      priority: note.priority || "medium",
      completed: note.completed || 0,
      createdAt: new Date(),
    };
    notes.push(newNote);
    localStorage.setItem('timeBlocker_notes', JSON.stringify(notes));
    return newNote;
  },
  
  async updateNote(id: string, updates: Partial<InsertNote>): Promise<Note> {
    const notes = await this.getNotes();
    const index = notes.findIndex(n => n.id === id);
    if (index !== -1) {
      notes[index] = { ...notes[index], ...updates };
      localStorage.setItem('timeBlocker_notes', JSON.stringify(notes));
      return notes[index];
    }
    throw new Error('Note not found');
  },
  
  async deleteNote(id: string): Promise<void> {
    const notes = await this.getNotes();
    const filtered = notes.filter(n => n.id !== id);
    localStorage.setItem('timeBlocker_notes', JSON.stringify(filtered));
  }
};

type DrawerState = "collapsed" | "partial" | "full";

export default function NotesDrawer() {
  const [drawerHeight, setDrawerHeight] = useState(0.25); // Start with 25% of screen height
  const [showComposer, setShowComposer] = useState(false);
  const [newNote, setNewNote] = useState({ title: "", description: "", priority: "medium" as "low" | "medium" | "high" });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartHeight, setDragStartHeight] = useState(0);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragStart, handleDragEnd } = useDragDrop();

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/notes", undefined);
        const data = await res.json();
        return data;
      } catch (error) {
        const data = await mockNotesApi.getNotes();
        return data;
      }
    },
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: InsertNote) => {
      try {
        const res = await apiRequest("POST", "/api/notes", note);
        return res.json();
      } catch (error) {
        const result = await mockNotesApi.createNote(note);
        return result;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNote({ title: "", description: "", priority: "medium" });
      setShowComposer(false);
      
      // Auto-expand drawer when note is added (only if it's currently small)
      if (drawerHeight < 0.4) {
        const newHeight = Math.min(drawerHeight + 0.15, 0.5); // Increase by 15%, max 50%
        setDrawerHeight(newHeight);
      }
      
      toast({
        title: "Note created",
        description: "Drag this note into the calendar when ready.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertNote> }) => {
      try {
        const res = await apiRequest("PATCH", `/api/notes/${id}`, updates);
        return res.json();
      } catch (error) {
        return mockNotesApi.updateNote(id, updates);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiRequest("DELETE", `/api/notes/${id}`);
      } catch (error) {
        await mockNotesApi.deleteNote(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    },
  });

  const handleAddNote = () => {
    if (!newNote.title.trim()) {
      toast({
        title: "Empty note",
        description: "Please enter a note title.",
        variant: "destructive",
      });
      return;
    }
    
    const noteToCreate = {
      title: newNote.title.trim(),
      description: newNote.description.trim() || undefined,
      priority: newNote.priority,
      completed: 0,
    };
    
    createNoteMutation.mutate(noteToCreate);
  };

  const handleToggleComplete = (note: Note) => {
    updateNoteMutation.mutate({
      id: note.id,
      updates: { completed: note.completed ? 0 : 1 },
    });
  };

  const getDrawerHeightPx = () => {
    return `${drawerHeight * 100}vh`; // Convert percentage to viewport height
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartHeight(drawerHeight);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaY = dragStartY - e.clientY; // Inverted because we want up movement to increase height
    const deltaHeight = deltaY / window.innerHeight; // Convert pixels to viewport percentage
    const newHeight = Math.min(Math.max(dragStartHeight + deltaHeight, 0.1), 0.6); // Min 10%, max 60%
    
    setDrawerHeight(newHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartY, dragStartHeight]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Note was dragged away, auto-contract drawer if it has no notes left
    // We'll update this logic when we get the updated notes count
    setTimeout(() => {
      // Check if notes were actually removed and adjust accordingly
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
    }, 100);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[60] transition-all duration-300"
      style={{ height: getDrawerHeightPx() }}
      data-testid="notes-drawer"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drawer Handle */}
      <div
        className="drawer-handle h-8 rounded-t-xl cursor-ns-resize flex items-center justify-center px-4 relative select-none"
        data-testid="drawer-handle"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <div className="w-12 h-1 bg-white/40 rounded-full"></div>
          <div className="text-xs font-apercu text-white/70">
            <span data-testid="text-notes-count">{notes.length}</span> notes
          </div>
        </div>
      </div>
      
      {/* Drawer Content */}
      <div className="glass-card rounded-t-2xl shadow-2xl p-6 h-full overflow-hidden flex flex-col">
          {/* Add Note Card */}
          {!showComposer && (
            <div 
              className="glass-subtle rounded-xl p-4 mb-4 cursor-pointer hover:bg-white/20 transition-all text-center border-2 border-dashed border-white/20 hover:border-soft-cyan/50"
              onClick={() => setShowComposer(true)}
              data-testid="add-note-card"
            >
              <div className="flex items-center justify-center gap-2 text-white/70 hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
                <span className="font-apercu font-medium">Add Note</span>
              </div>
            </div>
          )}

          {/* Composer Area */}
          {showComposer && (
            <div className="mb-4 border-b border-white/10 pb-4">
              <div className="flex gap-3 mb-3">
                <Input
                  placeholder="Add a new note..."
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="flex-1 glass-subtle bg-transparent placeholder-white/60 border-white/20 focus:border-soft-cyan text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddNote();
                    }
                  }}
                  data-testid="input-note-title"
                />
                
                <Select
                  value={newNote.priority}
                  onValueChange={(value) => 
                    setNewNote({ ...newNote, priority: value as "low" | "medium" | "high" })
                  }
                >
                  <SelectTrigger className="w-24 glass-subtle bg-transparent border-white/20 text-white" data-testid="select-note-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-deep-violet border-white/20">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleAddNote}
                  disabled={!newNote.title.trim() || createNoteMutation.isPending}
                  className="gradient-button glow-hover text-white"
                  data-testid="button-add-note"
                >
                  Add
                </Button>
              </div>
              
              {newNote.title && (
                <Textarea
                  placeholder="Add description (optional)..."
                  value={newNote.description}
                  onChange={(e) => setNewNote({ ...newNote, description: e.target.value })}
                  className="glass-subtle bg-transparent placeholder-white/60 border-white/20 focus:border-soft-cyan text-white resize-none"
                  rows={2}
                  data-testid="textarea-note-description"
                />
              )}
              
              <div className="flex justify-end mt-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowComposer(false);
                    setNewNote({ title: "", description: "", priority: "medium" });
                  }}
                  className="text-white/60 hover:text-white mr-2 font-apercu"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-2" data-testid="notes-list">
            {isLoading ? (
              <div className="text-center text-white/60 py-8">Loading notes...</div>
            ) : notes.length === 0 && !showComposer ? (
              <div className="text-center text-white/60 py-8">
                <p className="font-apercu">Click "Add Note" above to get started.</p>
              </div>
            ) : (
              notes.map((note: Note) => (
                <div
                  key={note.id}
                  className={`note-item glass-subtle rounded-lg p-3 flex items-center gap-3 cursor-grab hover:bg-white/20 transition-all ${
                    note.completed ? "opacity-60" : ""
                  }`}
                  draggable={!note.completed}
                  onDragStart={(e) => !note.completed && handleDragStart(note, e.nativeEvent)}
                  onDragEnd={(e) => handleDragEnd(e.nativeEvent)}
                  data-testid={`note-item-${note.id}`}
                >
                  <Checkbox
                    checked={Boolean(note.completed)}
                    onCheckedChange={() => handleToggleComplete(note)}
                    className="border-white/40 data-[state=checked]:bg-electric-violet data-[state=checked]:border-electric-violet"
                    data-testid={`checkbox-note-${note.id}`}
                  />
                  
                  <div className="text-white/40">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-maison font-medium text-white ${note.completed ? "line-through" : ""}`}>
                        {note.title}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-apercu ${
                        note.priority === "high"
                          ? "bg-red-500/20 text-red-300 border border-red-500/30"
                          : note.priority === "medium"
                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                          : "bg-green-500/20 text-green-300 border border-green-500/30"
                      }`}>
                        {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)}
                      </span>
                    </div>
                    {note.description && (
                      <p className="text-sm text-white/60 font-apercu truncate">
                        {note.description}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNoteMutation.mutate(note.id)}
                    className="text-white/40 hover:text-white transition-colors p-1"
                    data-testid={`button-delete-note-${note.id}`}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
    </div>
  );
}

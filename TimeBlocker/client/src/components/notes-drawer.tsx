import { useState } from "react";
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

type DrawerState = "collapsed" | "partial" | "full";

export default function NotesDrawer() {
  const [drawerState, setDrawerState] = useState<DrawerState>("collapsed");
  const [newNote, setNewNote] = useState({ title: "", description: "", priority: "medium" as const });
  const [showComposer, setShowComposer] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleDragStart, handleDragEnd } = useDragDrop();

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const createNoteMutation = useMutation({
    mutationFn: async (note: InsertNote) => {
      const res = await apiRequest("POST", "/api/notes", note);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNewNote({ title: "", description: "", priority: "medium" });
      setShowComposer(false);
      toast({
        title: "Note created",
        description: "Drag this note into the calendar when ready.",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InsertNote> }) => {
      const res = await apiRequest("PATCH", `/api/notes/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
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

  const handleAddNote = () => {
    if (!newNote.title.trim()) return;
    
    createNoteMutation.mutate({
      title: newNote.title.trim(),
      description: newNote.description.trim() || undefined,
      priority: newNote.priority,
      completed: 0,
    });
  };

  const handleToggleComplete = (note: Note) => {
    updateNoteMutation.mutate({
      id: note.id,
      updates: { completed: note.completed ? 0 : 1 },
    });
  };

  const getDrawerHeight = () => {
    if (drawerState === "collapsed") return "32px";
    if (drawerState === "full") return "60vh";
    
    // Partial: auto-expand based on content
    const baseHeight = 140; // Composer area + padding
    const noteHeight = 68; // Per note
    const maxNotes = 4;
    const visibleNotes = Math.min(notes.length, maxNotes);
    const contentHeight = baseHeight + (visibleNotes * noteHeight);
    return `${Math.min(contentHeight, 400)}px`;
  };

  const activePriorityClasses = {
    low: "priority-low",
    medium: "priority-medium",
    high: "priority-high",
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 transition-all duration-300"
      style={{ height: getDrawerHeight() }}
      data-testid="notes-drawer"
    >
      {/* Drawer Handle */}
      <div
        className="drawer-handle h-8 rounded-t-xl cursor-ns-resize flex items-center justify-center relative"
        onClick={() => setDrawerState(drawerState === "collapsed" ? "partial" : "collapsed")}
        data-testid="drawer-handle"
      >
        <div className="w-12 h-1 bg-white/40 rounded-full"></div>
        <div className="ml-4 text-xs font-apercu text-white/70">
          <span data-testid="text-notes-count">{notes.length}</span> notes
        </div>
      </div>
      
      {/* Drawer Content */}
      {drawerState !== "collapsed" && (
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
                  onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
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
                      <span className={`font-apercu text-white ${note.completed ? "line-through" : ""}`}>
                        {note.title}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-apercu ${activePriorityClasses[note.priority]}`}>
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
      )}
    </div>
  );
}

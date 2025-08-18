import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@shared/schema";

export function useDragDrop() {
  const [draggedNote, setDraggedNote] = useState<Note | null>(null);
  const [dropZones, setDropZones] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleDragStart = useCallback((note: Note, event: DragEvent) => {
    setDraggedNote(note);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/json", JSON.stringify(note));
    }
    
    // Highlight all potential drop zones
    const zones = document.querySelectorAll("[data-drop-zone]");
    const zoneIds = Array.from(zones).map(zone => zone.getAttribute("data-drop-zone") || "");
    setDropZones(new Set(zoneIds));
    
    // Add drag ghost styling
    if (event.target instanceof HTMLElement) {
      event.target.classList.add("drag-ghost");
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEvent) => {
    setDraggedNote(null);
    setDropZones(new Set());
    
    // Remove drag ghost styling
    if (event.target instanceof HTMLElement) {
      event.target.classList.remove("drag-ghost");
    }
    
    // Remove highlight from all drop zones
    document.querySelectorAll(".drop-zone-highlight").forEach(zone => {
      zone.classList.remove("drop-zone-highlight");
    });
  }, []);

  const handleDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
    
    // Highlight the current drop zone
    if (event.target instanceof HTMLElement) {
      const dropZone = event.target.closest("[data-drop-zone]");
      if (dropZone) {
        dropZone.classList.add("drop-zone-highlight");
      }
    }
  }, []);

  const handleDragLeave = useCallback((event: DragEvent) => {
    // Remove highlight when leaving a drop zone
    if (event.target instanceof HTMLElement) {
      const dropZone = event.target.closest("[data-drop-zone]");
      if (dropZone) {
        dropZone.classList.remove("drop-zone-highlight");
      }
    }
  }, []);

  const handleDrop = useCallback((event: DragEvent, onDrop: (note: Note) => void) => {
    event.preventDefault();
    
    try {
      const noteData = event.dataTransfer?.getData("application/json");
      if (noteData) {
        const note = JSON.parse(noteData) as Note;
        onDrop(note);
        toast({
          title: "Task scheduled",
          description: `"${note.title}" has been scheduled.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule task.",
        variant: "destructive",
      });
    }
    
    // Clean up drop zone highlights
    document.querySelectorAll(".drop-zone-highlight").forEach(zone => {
      zone.classList.remove("drop-zone-highlight");
    });
  }, [toast]);

  return {
    draggedNote,
    dropZones,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

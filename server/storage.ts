import { type User, type InsertUser, type Note, type InsertNote, type Task, type InsertTask } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getNotes(userId: string): Promise<Note[]>;
  createNote(userId: string, note: InsertNote): Promise<Note>;
  updateNote(noteId: string, updates: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(noteId: string): Promise<boolean>;
  
  getTasks(userId: string, date?: string): Promise<Task[]>;
  createTask(userId: string, task: InsertTask): Promise<Task>;
  updateTask(taskId: string, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(taskId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private notes: Map<string, Note>;
  private tasks: Map<string, Task>;

  constructor() {
    this.users = new Map();
    this.notes = new Map();
    this.tasks = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getNotes(userId: string): Promise<Note[]> {
    return Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNote(userId: string, insertNote: InsertNote): Promise<Note> {
    const id = randomUUID();
    const note: Note = {
      id,
      userId,
      title: insertNote.title,
      description: insertNote.description || null,
      priority: insertNote.priority,
      completed: insertNote.completed,
      createdAt: new Date(),
    };
    this.notes.set(id, note);
    return note;
  }

  async updateNote(noteId: string, updates: Partial<InsertNote>): Promise<Note | undefined> {
    const note = this.notes.get(noteId);
    if (!note) return undefined;
    
    const updatedNote: Note = {
      ...note,
      title: updates.title ?? note.title,
      description: updates.description !== undefined ? updates.description : note.description,
      priority: updates.priority ?? note.priority,
      completed: updates.completed ?? note.completed,
    };
    this.notes.set(noteId, updatedNote);
    return updatedNote;
  }

  async deleteNote(noteId: string): Promise<boolean> {
    return this.notes.delete(noteId);
  }

  async getTasks(userId: string, date?: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => {
        if (task.userId !== userId) return false;
        if (date && task.date !== date) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        if (!a.startTime && b.startTime) return 1;
        if (a.startTime && !b.startTime) return -1;
        if (!a.startTime && !b.startTime) return 0;
        return a.startTime!.localeCompare(b.startTime!);
      });
  }

  async createTask(userId: string, insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      id,
      userId,
      noteId: insertTask.noteId || null,
      title: insertTask.title,
      description: insertTask.description || null,
      priority: insertTask.priority,
      date: insertTask.date,
      startTime: insertTask.startTime || null,
      duration: insertTask.duration || null,
      completed: insertTask.completed,
      createdAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(taskId: string, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(taskId);
    if (!task) return undefined;
    
    const updatedTask: Task = {
      ...task,
      noteId: updates.noteId !== undefined ? updates.noteId : task.noteId,
      title: updates.title ?? task.title,
      description: updates.description !== undefined ? updates.description : task.description,
      priority: updates.priority ?? task.priority,
      date: updates.date ?? task.date,
      startTime: updates.startTime !== undefined ? updates.startTime : task.startTime,
      duration: updates.duration !== undefined ? updates.duration : task.duration,
      completed: updates.completed ?? task.completed,
    };
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return this.tasks.delete(taskId);
  }
}

export const storage = new MemStorage();

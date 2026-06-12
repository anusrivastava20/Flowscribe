export interface Task {
  id: string;
  title: string;
  description: string;
  assignee: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[]; // Titles or IDs of tasks this task depends on
  status: 'todo' | 'inprogress' | 'review' | 'done';
  noteColor: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
  rotation: number; // Slight rotation angle in degrees for visual style (-3 to 3)
}

export interface Board {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  createdAt: string;
  imageUrl?: string; // Cache the background or uploaded image
}

export interface ProjectSummary {
  projectId: string;
  projectName: string;
  completedTasks: number;
  pendingTasks: number;
  totalTasks: number;
  tasksList: { id: string; title: string; status: string; assignee: string; deadline: string }[];
}

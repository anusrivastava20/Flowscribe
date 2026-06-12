import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Share2, 
  FileDown, 
  Pin, 
  Clipboard, 
  FolderOpen, 
  Camera, 
  BookOpen, 
  User, 
  Clock, 
  CheckCircle, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  Link2,
  ChevronRight,
  Info,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Board, Task, ProjectSummary } from './types';
import { SAMPLE_BOARDS } from './data/samples';

export default function App() {
  // Primary State
  const [boards, setBoards] = useState<Board[]>(() => {
    const saved = localStorage.getItem('flowscribe_boards');
    return saved ? JSON.parse(saved) : SAMPLE_BOARDS;
  });
  
  const [activeBoardId, setActiveBoardId] = useState<string>(() => {
    const saved = localStorage.getItem('flowscribe_active_id');
    return saved || SAMPLE_BOARDS[0].id;
  });

  // UX Preferences
  const [deskTheme, setDeskTheme] = useState<'corkboard' | 'blueprint'>('corkboard');
  const [ledgerOpen, setLedgerOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Create / Edit Task state
  const [showTaskModal, setShowTaskModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [taskForm, setTaskForm] = useState<{
    id?: string;
    title: string;
    description: string;
    assignee: string;
    deadline: string;
    priority: 'low' | 'medium' | 'high';
    noteColor: 'yellow' | 'pink' | 'blue' | 'green' | 'orange';
    status: 'todo' | 'inprogress' | 'review' | 'done';
    dependencies: string;
  }>({
    title: '',
    description: '',
    assignee: '',
    deadline: 'Next Monday',
    priority: 'medium',
    noteColor: 'yellow',
    status: 'todo',
    dependencies: '',
  });

  // AI Analyzer State
  const [uploadFile, setUploadFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [projectFocus, setProjectFocus] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStatus, setAnalyzingStatus] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Voice Input & Vocal Assistant State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
  const [voiceGuidanceActive, setVoiceGuidanceActive] = useState<boolean>(true);
  const [speechSupported, setSpeechSupported] = useState<boolean>(false);
  const [assistantMessage, setAssistantMessage] = useState<string>('Welcome back. Tell me goals or activate read aloud for updates.');

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      setSpeechSupported(true);
    }
  }, []);

  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    if (!voiceGuidanceActive) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    
    // Attempt standard voices
    const voices = window.speechSynthesis.getVoices();
    const candidateVoice = voices.find(v => v.lang.includes('en-US')) || voices[0];
    if (candidateVoice) {
      utterance.voice = candidateVoice;
    }

    utterance.onstart = () => {
      setIsPlayingVoice(true);
    };
    utterance.onend = () => {
      setIsPlayingVoice(false);
    };
    utterance.onerror = () => {
      setIsPlayingVoice(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleFocusDictation = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Try Chrome or Safari.");
      return;
    }

    if (isListening) {
      const rec = (window as any).recognitionInstance;
      if (rec) {
        rec.stop();
      }
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      speakText("Listening now. Please state your project requirements.");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setProjectFocus(prev => prev ? prev + ' ' + transcript : transcript);
      setAssistantMessage(`Voice added: "${transcript}"`);
      speakText(`Understood. Appended statement.`);
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    (window as any).recognitionInstance = recognition;
    recognition.start();
  };

  const readBoardWorkflowSummary = () => {
    const totalSteps = activeBoard.tasks.length;
    let text = `Showing workspace, ${activeBoard.name}. `;
    if (activeBoard.description) {
      text += `The board description states: ${activeBoard.description}. `;
    }
    
    const todoCount = activeBoard.tasks.filter(t => t.status === 'todo').length;
    const inProgressCount = activeBoard.tasks.filter(t => t.status === 'inprogress').length;
    const reviewCount = activeBoard.tasks.filter(t => t.status === 'review').length;
    const doneCount = activeBoard.tasks.filter(t => t.status === 'done').length;

    text += `There are ${totalSteps} visual items currently pinned on your board. `;
    text += `To Do has ${todoCount} items. In Progress has ${inProgressCount} items. Review has ${reviewCount} items, and Concluded has ${doneCount} items. `;

    if (activeBoard.tasks.length > 0) {
      const highPriorityTasks = activeBoard.tasks.filter(t => t.priority === 'high');
      if (highPriorityTasks.length > 0) {
        text += `High priority updates are: ` + highPriorityTasks.map(t => `${t.title} assigned to ${t.assignee || 'general team'}`).join(', ') + '. ';
      } else {
        text += `Active workflow items include: ` + activeBoard.tasks.slice(0, 3).map(t => `${t.title}`).join(', ') + '. ';
      }
    }
    
    setAssistantMessage(`Playing voice readout of board: ${activeBoard.name}`);
    speakText(text);
  };

  // Synchronize state changes to localStorage
  useEffect(() => {
    localStorage.setItem('flowscribe_boards', JSON.stringify(boards));
  }, [boards]);

  useEffect(() => {
    localStorage.setItem('flowscribe_active_id', activeBoardId);
  }, [activeBoardId]);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || SAMPLE_BOARDS[0];

  // Drag and Drop Engine
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: 'todo' | 'inprogress' | 'review' | 'done') => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    setBoards(prevBoards => prevBoards.map(board => {
      if (board.id !== activeBoard.id) return board;
      return {
        ...board,
        tasks: board.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, status: targetStatus };
          }
          return task;
        }),
      };
    }));
  };

  // Move task step-by-step manually (accessible feedback fallback)
  const moveTaskStatus = (task: Task, direction: 'forward' | 'backward') => {
    const statusOrder: ('todo' | 'inprogress' | 'review' | 'done')[] = ['todo', 'inprogress', 'review', 'done'];
    const currentIndex = statusOrder.indexOf(task.status);
    let nextIndex = currentIndex;
    
    if (direction === 'forward' && currentIndex < statusOrder.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === 'backward' && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }
    
    if (nextIndex === currentIndex) return;
    const targetStatus = statusOrder[nextIndex];

    setBoards(prev => prev.map(b => {
      if (b.id !== activeBoard.id) return b;
      return {
        ...b,
        tasks: b.tasks.map(t => t.id === task.id ? { ...t, status: targetStatus } : t)
      };
    }));
  };

  // Convert File to Base64 safely
  const processSelectedFile = (file: File) => {
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setGenerationError("File exceeds 20MB limit. Please upload a smaller image or short video.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setUploadPreview(result);
      setUploadFile({
        base64: result,
        mimeType: file.type,
        name: file.name
      });
      setGenerationError(null);
    };
    reader.readAsDataURL(file);
  };

  // Select a preset whiteboard preview for instant demo simulation
  const selectWhiteboardTemplate = (type: 'conference' | 'mindmap' | 'scrum') => {
    // Generate lovely blueprint line layouts based on selection to serve as simulated photo visual
    const mockCaptures = {
      conference: {
        name: 'conference-brainstorm-diagram.png',
        mimeType: 'image/png',
        preview: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=800&auto=format&fit=crop', // Beautiful conference room sticky notes
        guideline: ' Conference room brain sync. Include UI sketches, DB setups, and testing iterations. Assign to Alice and Bob.'
      },
      mindmap: {
        name: 'system-dependency-workflow.png',
        mimeType: 'image/png',
        preview: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop', // Code on whiteboard / team work
        guideline: 'Core technical dependency flow. Clearly tag prerequisite sequences. Assign Dev and Architect roles.'
      },
      scrum: {
        name: 'retro-scrum-board.png',
        mimeType: 'image/png',
        preview: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=800&auto=format&fit=crop', // Wireframe sketching
        guideline: 'Feature development sprint. Ensure deadlines, milestones and owner checkmarks are specified.'
      }
    };

    const template = mockCaptures[type];
    setUploadPreview(template.preview);
    // Use a small fixed thumbnail-based simulation base64 so model can trigger
    setUploadFile({
      base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', // Valid pixel placeholder
      mimeType: template.mimeType,
      name: template.name
    });
    setProjectFocus(template.guideline);
    setGenerationError(null);
  };

  // Trigger Gemini vision analysis post
  const triggerMultimodalAnalysis = async () => {
    if (!uploadFile) {
      setGenerationError("Please choose or drag a whiteboard photo, plan diagram or template first.");
      return;
    }

    setIsAnalyzing(true);
    setGenerationError(null);

    // Realistic skeuomorphic log stepper
    const steps = [
      { t: "📷 Scanning and desk-digitizing raw ink canvas...", d: 1200 },
      { t: "🧠 Deploying Gemini Multimodal vision scanners...", d: 1500 },
      { t: "🔍 Extracting tasks, logical dependencies, and assignees...", d: 1800 },
      { t: "🏷️ Organizing stickies, prioritizing workflow streams...", d: 1000 },
      { t: "📌 Pinning tactile workspace cards with 3D shadows...", d: 800 }
    ];

    let currentStep = 0;
    const runSteps = () => {
      if (currentStep < steps.length) {
        setAnalyzingStatus(steps[currentStep].t);
        setTimeout(() => {
          currentStep++;
          runSteps();
        }, steps[currentStep - 1]?.d || 800);
      }
    };
    runSteps();

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64: uploadFile.base64,
          mimeType: uploadFile.mimeType,
          projectNotes: projectFocus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze layout whiteboard.");
      }

      const parsedJSON = await response.ok ? await response.json() : null;

      if (!parsedJSON || !parsedJSON.projectName) {
        throw new Error("Invalid structure returned. Try typing custom guidelines to orient compilation.");
      }

      // Convert generated output into Board models
      const newBoardId = `board-${Date.now()}`;
      const processedTasks: Task[] = parsedJSON.tasks.map((t: any, idx: number) => ({
        id: `task-${Date.now()}-${idx}`,
        title: t.title || "Untitled Blueprint Step",
        description: t.description || "",
        assignee: t.assignee || "Unassigned Specialist",
        priority: t.priority || "medium",
        status: t.status || "todo",
        deadline: t.deadline || "Next Sprint",
        dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
        noteColor: t.noteColor || ['yellow', 'pink', 'blue', 'green', 'orange'][idx % 5],
        rotation: Math.random() * 5 - 2.5 // Slightly rotate note
      }));

      const newBoard: Board = {
        id: newBoardId,
        name: parsedJSON.projectName,
        description: parsedJSON.projectDescription || "Workspace created from sketch analysis.",
        tasks: processedTasks,
        createdAt: new Date().toISOString(),
        imageUrl: uploadPreview || undefined
      };

      setBoards(prev => [newBoard, ...prev]);
      setActiveBoardId(newBoardId);
      setAssistantMessage(`Forged workspace: "${newBoard.name}" with ${processedTasks.length} interactive tasks.`);
      speakText(`Superb! Gemini vision has successfully finalized the compilation process. Pinned ${processedTasks.length} visual sticky tasks directly onto the board.`);
      
      // Clear file inputs
      setUploadFile(null);
      setUploadPreview(null);
      setProjectFocus('');
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Something went wrong during interpretation. Check your secrets setup.");
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStatus('');
    }
  };

  // Shared Link Endpoint logic
  const handleShareBoard = async () => {
    try {
      const response = await fetch('/api/boards/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeBoard)
      });
      
      if (!response.ok) throw new Error("Could not share board configuration.");

      const data = await response.json();
      const shareUrl = `${window.location.origin}/#share-${data.shareId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setShareFeedback("Copied board link to clipboard!");
      setTimeout(() => setShareFeedback(null), 3500);

    } catch (err: any) {
      setShareFeedback("Error: Link generation failed.");
      setTimeout(() => setShareFeedback(null), 3500);
    }
  };

  // Detect and fetch shared link at boot stage
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#share-')) {
      const shareId = hash.replace('#share-', '');
      setAnalyzingStatus("📥 Fastening shared workspace board onto drafting desk...");
      setIsAnalyzing(true);

      fetch(`/api/boards/share/${shareId}`)
        .then(res => {
          if (!res.ok) throw new Error("Could not recover board details.");
          return res.json();
        })
        .then(sharedContext => {
          // Check if board already added in browser to prevent duplication
          setBoards(prev => {
            if (prev.some(b => b.id === sharedContext.id)) return prev;
            return [sharedContext, ...prev];
          });
          setActiveBoardId(sharedContext.id);
        })
        .catch(err => {
          alert("Could not load the shared board: " + err.message);
        })
        .finally(() => {
          setIsAnalyzing(false);
          setAnalyzingStatus('');
          window.location.hash = ''; // Clear hash cleanly
        });
    }
  }, []);

  // Compute stats across all boards for the Spiral notebook report model
  const getWeeklyLedgerSummary = (): ProjectSummary[] => {
    return boards.map(board => {
      const total = board.tasks.length;
      const completed = board.tasks.filter(t => t.status === 'done').length;
      const pending = total - completed;
      return {
        projectId: board.id,
        projectName: board.name,
        completedTasks: completed,
        pendingTasks: pending,
        totalTasks: total,
        tasksList: board.tasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignee: t.assignee,
          deadline: t.deadline
        }))
      };
    });
  };

  // Print layout model
  const triggerPrintPdf = () => {
    window.print();
  };

  // Delete Project Board safely with confirmation dialog
  const handleDeleteBoard = (boardId: string) => {
    if (boards.length <= 1) {
      alert("You cannot delete the final remaining board. Create a new empty board first!");
      return;
    }
    const response = window.confirm(`Permanently wipe the "${activeBoard.name}" workspace from the desk?`);
    if (response) {
      const remainingBoards = boards.filter(b => b.id !== boardId);
      setBoards(remainingBoards);
      setActiveBoardId(remainingBoards[0].id);
    }
  };

  // Create empty manual board
  const createBlankBoard = () => {
    const title = prompt("Specify title for your physical workflow board:", "New Creative Sprint");
    if (!title) return;
    const newBoard: Board = {
      id: `board-${Date.now()}`,
      name: title,
      description: "Organic manual board initialized on the architect drafting grid.",
      createdAt: new Date().toISOString(),
      tasks: []
    };
    setBoards(prev => [newBoard, ...prev]);
    setActiveBoardId(newBoard.id);
  };

  // Delete single sticky task
  const handleDeleteTask = (taskId: string) => {
    setBoards(prev => prev.map(b => {
      if (b.id !== activeBoard.id) return b;
      return {
        ...b,
        tasks: b.tasks.filter(t => t.id !== taskId)
      };
    }));
    setSelectedTask(null);
  };

  // Submit modal task creation/editing form
  const handleTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;

    const dependencyList = taskForm.dependencies
      ? taskForm.dependencies.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (modalMode === 'create') {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: taskForm.title,
        description: taskForm.description,
        assignee: taskForm.assignee || 'Unassigned',
        deadline: taskForm.deadline || 'flexible',
        priority: taskForm.priority,
        status: taskForm.status,
        noteColor: taskForm.noteColor,
        rotation: Math.random() * 6 - 3, // Random stick angle
        dependencies: dependencyList
      };

      setBoards(prev => prev.map(b => {
        if (b.id !== activeBoard.id) return b;
        return {
          ...b,
          tasks: [...b.tasks, newTask]
        };
      }));
    } else {
      // Editing existing sticky card
      setBoards(prev => prev.map(b => {
        if (b.id !== activeBoard.id) return b;
        return {
          ...b,
          tasks: b.tasks.map(t => t.id === taskForm.id ? {
            ...t,
            title: taskForm.title,
            description: taskForm.description,
            assignee: taskForm.assignee,
            deadline: taskForm.deadline,
            priority: taskForm.priority,
            status: taskForm.status,
            noteColor: taskForm.noteColor,
            dependencies: dependencyList
          } : t)
        };
      }));
    }

    setShowTaskModal(false);
    // Reset form
    setTaskForm({
      title: '',
      description: '',
      assignee: '',
      deadline: 'Next Monday',
      priority: 'medium',
      noteColor: 'yellow',
      status: 'todo',
      dependencies: '',
    });
  };

  const openCreateTaskModal = (colId: 'todo' | 'inprogress' | 'review' | 'done') => {
    setModalMode('create');
    setTaskForm({
      title: '',
      description: '',
      assignee: '',
      deadline: 'Next Monday',
      priority: 'medium',
      noteColor: 'yellow',
      status: colId,
      dependencies: '',
    });
    setShowTaskModal(true);
  };

  const openEditTaskModal = (task: Task) => {
    setModalMode('edit');
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      deadline: task.deadline,
      priority: task.priority,
      noteColor: task.noteColor,
      status: task.status,
      dependencies: task.dependencies.join(', '),
    });
    setShowTaskModal(true);
  };

  // Color Mapping helpers — Natural Tones palette with skeuomorphic border accents
  const getStickyColorClasses = (color: 'yellow' | 'pink' | 'blue' | 'green' | 'orange') => {
    switch(color) {
      case 'yellow': return { bg: 'bg-[#fff7ad] border-l-[5px] border-[#f1c40f] hover:bg-[#fff9bf]', ring: 'ring-yellow-400', txt: 'text-[#2a1d15]', secondary: 'bg-yellow-200/40' };
      case 'pink': return { bg: 'bg-[#ffadad] border-l-[5px] border-[#e74c3c] hover:bg-[#ffbfbf]', ring: 'ring-red-400', txt: 'text-rose-950', secondary: 'bg-rose-200/40' };
      case 'blue': return { bg: 'bg-[#d6f5ff] border-l-[5px] border-[#3498db] hover:bg-[#e3f8ff]', ring: 'ring-blue-400', txt: 'text-sky-950', secondary: 'bg-sky-200/40' };
      case 'green': return { bg: 'bg-[#e1ffd6] border-l-[5px] border-[#27ae60] hover:bg-[#ecffea]', ring: 'ring-green-400', txt: 'text-emerald-950', secondary: 'bg-[#27ae60]/10' };
      case 'orange': return { bg: 'bg-[#ffd7ad] border-l-[5px] border-[#e67e22] hover:bg-[#ffdfbf]', ring: 'ring-[#e67e22]', txt: 'text-amber-950', secondary: 'bg-[#e67e22]/10' };
    }
  };

  const getPriorityBadgeColor = (p: 'high' | 'medium' | 'low') => {
    switch (p) {
      case 'high': return 'bg-red-500/20 text-red-700 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-800 border-amber-500/30';
      case 'low': return 'bg-slate-500/10 text-slate-700 border-slate-500/20';
    }
  };

  // Columns specification
  const columnDefs: { id: 'todo' | 'inprogress' | 'review' | 'done'; title: string; desc: string; icon: string }[] = [
    { id: 'todo', title: '📌 To Do', desc: 'Tasks to implement', icon: '📍' },
    { id: 'inprogress', title: '⚡ In Progress', desc: 'Actively in motion', icon: '🔨' },
    { id: 'review', title: '🔍 In Review', desc: 'Awaiting checks & test verification', icon: '👀' },
    { id: 'done', title: '✅ Done', desc: 'Resolved and cataloged', icon: '🎉' }
  ];

  return (
    <div className="min-h-screen texture-desk font-sans text-stone-800 flex flex-col antialiased overflow-x-hidden relative">
      
      {/* Decorative Natural Tones Top Shelf Header */}
      <header className="no-print bg-[#2a1d15] border-b border-[#4d3a2b] shadow-lg sticky top-0 z-50 px-4 md:px-8 py-3 flex flex-wrap items-center justify-between text-[#f5e6d3]">
        
        {/* Brand visual header */}
        <div className="flex items-center space-x-3 py-1">
          <div className="bg-[#e67e22] text-[#2a1d15] font-black p-2.5 rounded-lg shadow-inner flex items-center justify-center transform -rotate-2 border border-[#4d3a2b]/40">
            <Sparkles className="h-5 w-5 text-[#2a1d15] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-display font-extrabold tracking-tight text-[#f5e6d3] uppercase m-0 leading-none">FlowScribe</h1>
              <span className="text-[9px] bg-[#e67e22] text-[#2a1d15] px-1.5 py-0.5 rounded font-mono font-bold leading-none transform rotate-1">EDITION</span>
            </div>
            <p className="text-[10px] text-[#bca58d] font-mono tracking-wider mt-0.5 uppercase">Architect's Multimodal Sync</p>
          </div>
        </div>

        {/* Central Workspace Board Picker */}
        <div className="flex items-center space-x-2 my-2 sm:my-0">
          <div className="flex items-center bg-[#1d140e] rounded-lg p-1.5 border border-[#4d3a2b] shadow-inner">
            <FolderOpen className="h-4.5 w-4.5 text-[#e67e22] mr-2 ml-1" />
            <select
              value={activeBoardId}
              onChange={(e) => setActiveBoardId(e.target.value)}
              className="bg-transparent text-[#f5e6d3] font-display text-sm font-semibold focus:outline-none pr-6 cursor-pointer border-none"
            >
              {boards.map(b => (
                <option key={b.id} value={b.id} className="bg-[#2a1d15] text-[#f5e6d3]">
                  📁 {b.name} ({b.tasks.length})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={createBlankBoard}
            title="Create empty manual board"
            className="bg-[#3d2b1f] hover:bg-[#4a3424] text-[#f5e6d3] p-2 rounded-lg transition-all border border-[#4d3a2b] hover:scale-105 active:scale-95"
            id="btn-create-board"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tactical Actions bar */}
        <div className="flex items-center space-x-2 flex-wrap gap-1">
          {/* Theme Selector */}
          <div className="flex bg-[#1d140e] p-1 rounded-lg border border-[#4d3a2b] text-[11px] font-mono font-medium">
            <button
              onClick={() => setDeskTheme('corkboard')}
              className={`px-2.5 py-1 rounded transition-all ${deskTheme === 'corkboard' ? 'bg-[#e67e22] text-[#2a1d15] font-bold' : 'text-[#bca58d] hover:text-[#f5e6d3]'}`}
            >
              🪵 Natural Tones
            </button>
            <button
              onClick={() => setDeskTheme('blueprint')}
              className={`px-2.5 py-1 rounded transition-all ${deskTheme === 'blueprint' ? 'bg-sky-700 text-[#f5e6d3] font-bold' : 'text-[#bca58d] hover:text-[#f5e6d3]'}`}
            >
              📐 Blueprint
            </button>
          </div>

          {/* Ledger notebook trigger */}
          <button
            onClick={() => setLedgerOpen(!ledgerOpen)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${ledgerOpen ? 'bg-[#e67e22] text-[#2a1d15] font-bold' : 'bg-[#3d2b1f] hover:bg-[#4a3424] text-[#bca58d]'} border border-[#4d3a2b] shadow-sm transition-all`}
          >
            <Clipboard className="h-4 w-4" />
            <span>Ledger Book</span>
          </button>

          {/* Link Export */}
          <button
            onClick={handleShareBoard}
            className="bg-[#1d140e] hover:bg-[#2a1d15] text-[#bca58d] hover:text-[#f5e6d3] flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono border border-[#4d3a2b] transition-all hover:scale-105"
            title="Saves config to proxy server & copies link"
            id="btn-share-board"
          >
            <Share2 className="h-3.5 w-3.5 text-[#e67e22]" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {/* PDF Visual printer - Using Natural Tones accent color styling */}
          <button
            onClick={triggerPrintPdf}
            className="bg-[#f5e6d3] hover:bg-white text-[#2a1d15] flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase transition-all shadow-md hover:scale-105"
            title="Triggers high fidelity browser media printing"
            id="btn-export-pdf"
          >
            <FileDown className="h-3.5 w-3.5 text-[#e67e22]" />
            <span>Export Layout</span>
          </button>

          {/* Delete Board */}
          <button
            onClick={() => handleDeleteBoard(activeBoard.id)}
            className="text-red-400 hover:bg-red-950/40 p-2 rounded-lg transition-all"
            title="Wipe active board"
            id="btn-delete-board"
          >
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Share Toast Alerts */}
      {shareFeedback && (
        <div className="fixed top-18 right-4 bg-stone-900 text-white border-2 border-amber-500 scale-100 duration-300 py-3 px-5 rounded-lg shadow-2xl z-50 flex items-center space-x-2 font-mono text-xs animate-bounce" id="toast-share">
          <Link2 className="h-4 w-4 text-emerald-400 mr-1" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Main Drafting Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* LEFT COMPILER PANEL: Whiteboard scan upload zone & project detail guide — Natural Tones edition */}
        <aside className="no-print w-full md:w-80 bg-[#e8e4d9] border-r border-[#d1cbbd] shadow-inner flex flex-col justify-start p-5 shrink-0 z-20 text-[#2d241e]">
          
          <div className="mb-5 bg-white p-4 rounded-lg shadow-sm border border-[#d1cbbd] relative overflow-hidden">
            <span className="absolute top-0 right-0 translate-x-2 -translate-y-2 text-6xl text-[#bca58d]/20 font-serif font-extrabold italic">01</span>
            <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-[#2a1d15] mb-2 flex items-center">
              <Camera className="h-4 w-4 text-[#e67e22] mr-1.5" /> 
              Digitize Visual Content
            </h2>
            <p className="text-xs text-[#2d241e]/80 leading-relaxed font-sans">
              Scan images or screenshots of project brainstorms, tables, mind maps, flows or drawings.
            </p>
          </div>

          {/* File input / visual drag frame */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingOver(false);
              if (e.dataTransfer.files?.[0]) {
                processSelectedFile(e.dataTransfer.files[0]);
              }
            }}
            className={`border-2 border-dashed rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center relative cursor-pointer min-h-[160px] ${
              isDraggingOver 
                ? 'border-[#e67e22] bg-[#f5e6d3]/40' 
                : uploadPreview 
                  ? 'border-emerald-500 bg-white' 
                  : 'border-[#a89d8c] hover:border-[#2a1d15] bg-[#d1cbbd]/40 hover:bg-[#d1cbbd]/60'
            }`}
          >
            {uploadPreview ? (
              <div className="w-full relative h-36 rounded overflow-hidden shadow-sm group">
                <img 
                  src={uploadPreview} 
                  alt="Whiteboard snapshot crop" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-xs text-white font-mono bg-[#2a1d15] py-1 px-2 rounded">
                    Replace Drawing
                  </p>
                </div>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => e.target.files?.[0] && processSelectedFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-2">
                <div className="w-12 h-12 bg-[#a89d8c] rounded-full flex items-center justify-center mb-3">
                  <Camera className="h-6 w-6 text-[#e8e4d9]" />
                </div>
                <p className="text-xs text-[#8d7d6a] font-bold uppercase mb-0.5">
                  Upload Board Scan
                </p>
                <p className="text-[10px] text-[#8d7d6a] mb-2 font-mono">PNG, JPG or Video (max 20MB)</p>
                <span className="bg-[#f5e6d3] hover:bg-white text-[#2a1d15] px-3 py-1 rounded text-xs transition-colors font-mono font-medium border border-[#d1cbbd] shadow-sm">
                  Browse Files
                </span>
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  onChange={(e) => e.target.files?.[0] && processSelectedFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  id="whiteboard-file-picker"
                />
              </div>
            )}
          </div>

          {/* Quick Demo Templates Selection */}
          <div className="mt-3.5">
            <p className="text-[10px] uppercase tracking-wider text-[#8d7d6a] font-mono font-bold mb-1.5 flex items-center justify-center">
              <span>Or use a Studio Mockup Sketch</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button 
                onClick={() => selectWhiteboardTemplate('conference')}
                className="text-[10px] font-mono py-1.5 px-1 bg-white hover:bg-[#f5e6d3] border border-[#d1cbbd] rounded text-[#2a1d15] hover:text-[#2a1d15] font-semibold transition-all shadow-sm"
                title="Conference board mockup"
                id="preset-conference"
              >
                👥 Conf Room
              </button>
              <button 
                onClick={() => selectWhiteboardTemplate('mindmap')}
                className="text-[10px] font-mono py-1.5 px-1 bg-white hover:bg-[#f5e6d3] border border-[#d1cbbd] rounded text-[#2a1d15] hover:text-[#2a1d15] font-semibold transition-all shadow-sm"
                title="Engineering Mind Map layout diagram"
                id="preset-mindmap"
              >
                📐 Diagram
              </button>
              <button 
                onClick={() => selectWhiteboardTemplate('scrum')}
                className="text-[10px] font-mono py-1.5 px-1 bg-white hover:bg-[#f5e6d3] border border-[#d1cbbd] rounded text-[#2a1d15] hover:text-[#2a1d15] font-semibold transition-all shadow-sm"
                title="Post-it board drawing mockup"
                id="preset-scrum"
              >
                📝 Post-it
              </button>
            </div>
          </div>

          <hr className="my-4 border-[#d1cbbd]" />

          {/* COMPANION VOICE CONTROL CARD */}
          <div className="mb-4 bg-[#fdfcf9] rounded-xl p-4 border border-[#d1cbbd] shadow-sm text-[#2d241e]">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#d1cbbd]">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm">🗣️</span>
                <h3 className="text-xs font-serif font-bold uppercase tracking-wider text-[#2a1d15] m-0">Vocal Companion</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-widest ${
                isPlayingVoice 
                  ? 'bg-red-100 text-red-700 border border-red-300 animate-pulse' 
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {isPlayingVoice ? 'SPEAKING' : 'AUDIO ACTIVE'}
              </span>
            </div>

            {/* Live Message bubble */}
            <div className="bg-[#2a1d15] text-[#f5e6d3] p-2.5 rounded-lg font-mono text-[9px] leading-relaxed mb-3 border border-[#4d3a2b] shadow-inner relative max-h-24 overflow-y-auto">
              <div className="absolute top-1.5 right-2 flex space-x-1">
                {isPlayingVoice && <span className="w-1.5. h-1.5 rounded-full bg-red-500 animate-ping"></span>}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              </div>
              <p className="text-[#e67e22] font-bold uppercase tracking-wider mb-0.5 text-[8px]">Desk Guide Assistant:</p>
              <p className="italic">"{assistantMessage}"</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={readBoardWorkflowSummary}
                className="py-1.5 px-2 bg-[#f5e6d3] hover:bg-[#bca58d]/30 border border-[#d1cbbd] rounded-lg text-[10px] font-mono font-bold text-[#2a1d15] flex items-center justify-center space-x-1 hover:scale-[1.02] active:scale-95 transition-all shadow-xs"
                title="Convert entire card deck summary to audio reads"
              >
                <Volume2 className="h-3.5 w-3.5 text-[#e67e22]" />
                <span>Read Board</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setVoiceGuidanceActive(!voiceGuidanceActive);
                  if (voiceGuidanceActive) {
                    window.speechSynthesis.cancel();
                    setIsPlayingVoice(false);
                  }
                }}
                className={`py-1.5 px-2 border rounded-lg text-[10px] font-mono font-bold flex items-center justify-center space-x-1 transition-all ${
                  voiceGuidanceActive 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                    : 'bg-stone-100 border-stone-300 text-stone-600'
                }`}
                title="Toggles whether assistant speaks out updates dynamically"
              >
                {voiceGuidanceActive ? (
                  <>
                    <Volume2 className="h-3 w-3 text-emerald-600" />
                    <span>Mute Off</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-3 w-3 text-stone-500" />
                    <span>Muted</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <hr className="my-4 border-[#d1cbbd]" />

          {/* Manual Focus Guidance */}
          <div className="mb-4">
            <label className="block text-xs font-serif font-bold text-[#2a1d15] uppercase tracking-wide mb-1 flex items-center justify-between">
              <span className="flex items-center">✍️ Desk Focus Directives</span>
              <button
                type="button"
                onClick={toggleFocusDictation}
                className={`py-1 px-2.5 rounded-full flex items-center space-x-1 outline-none text-[10px] font-mono font-bold border transition-all ${
                  isListening 
                    ? 'bg-red-600 border-red-850 text-white animate-pulse' 
                    : 'bg-white hover:bg-[#f5e6d3] border-[#d1cbbd] text-[#2a1d15] animate-none'
                }`}
                title="Dictate directives using your voice recorder"
              >
                {isListening ? (
                  <>
                    <Mic className="h-2.5 w-2.5 text-white animate-bounce" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-2.5 w-2.5 text-[#e67e22]" />
                    <span>🎤 Dictate</span>
                  </>
                )}
              </button>
            </label>
            <textarea
              value={projectFocus}
              onChange={(e) => setProjectFocus(e.target.value)}
              placeholder="e.g. Include Alice as UX Lead, make database tasks high priority, or skip marketing details..."
              className="w-full h-24 p-2 text-xs border border-[#d1cbbd] bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#e67e22] text-[#2d241e] font-sans leading-relaxed resize-none shadow-sm"
              id="directives-textarea"
            />
          </div>

          {/* Core Analysis Compilation button - Terracotta Orange */}
          <button
            onClick={triggerMultimodalAnalysis}
            disabled={isAnalyzing || !uploadFile}
            className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center space-x-2 ${
              isAnalyzing 
                ? 'bg-[#a89d8c] text-stone-200 cursor-not-allowed'
                : !uploadFile 
                  ? 'bg-[#bca58d]/50 text-[#2a1d15]/50 border border-[#bca58d] cursor-not-allowed font-semibold' 
                  : 'bg-[#e67e22] hover:bg-[#d35400] text-white active:scale-95 hover:scale-[1.02] cursor-pointer'
            }`}
            id="btn-trigger-analysis"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Interpreting Visuals...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4.5 w-4.5" />
                <span>Forge with Gemini Vision</span>
              </>
            )}
          </button>

          {/* Processing and feedback log messages */}
          {isAnalyzing && (
            <div className="mt-4 bg-[#2a1d15] text-[#f5e6d3] p-2.5 rounded font-mono text-[10px] leading-relaxed shadow-lg border border-[#4d3a2b]">
              <div className="flex items-center space-x-1.5 mb-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-[#e67e22] animate-ping"></span>
                <span className="text-[#e67e22] font-bold">ANALYZER LOGS:</span>
              </div>
              <p className="animate-pulse">{analyzingStatus}</p>
            </div>
          )}

          {generationError && (
            <div className="mt-4 bg-[#f2dede] text-[#a94442] p-3 rounded-lg border border-[#ebccd1] text-xs shadow flex items-start space-x-2" id="error-container">
              <AlertCircle className="h-4 w-4 text-[#a94442] shrink-0 mt-0.5" />
              <p className="leading-relaxed font-mono text-[11px]">{generationError}</p>
            </div>
          )}

          {/* Visual Canvas Details Helper */}
          <div className="mt-auto pt-4 bg-transparent border-t border-[#d1cbbd] text-[11px] text-[#8d7d6a] leading-relaxed font-mono">
            <div className="flex items-center space-x-1 mb-1 font-bold text-[#8d7d6a] uppercase text-[10px]">
              <Info className="h-3 w-3 text-[#e67e22]" />
              <span>FlowScribe Mechanism</span>
            </div>
            <p>Using Google Gemini 3.5 Flash multimodal vision. This extracts structure diagrams directly, avoiding key leakages.</p>
          </div>
        </aside>

        {/* WORKSPACE AREA: Corkboard/Blueprint board lanes with pinned stickies */}
        <main className={`flex-1 p-4 md:p-6 select-none overflow-y-auto min-h-[500px] transition-colors relative ${deskTheme === 'corkboard' ? 'texture-corkboard' : 'texture-blueprint'}`}>
          
          {/* Active Board Details Header Card — Natural Tones edition */}
          <div className="bg-white/90 no-print rounded-xl p-4 md:p-5 mb-6 border border-[#d1cbbd] shadow-sm flex flex-col sm:flex-row justify-between items-start gap-4 text-[#2d241e]">
            <div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-xl">📁</span>
                <h2 className="text-xl md:text-2xl font-serif font-black tracking-tight text-[#2a1d15] m-0">
                  {activeBoard.name}
                </h2>
              </div>
              <p className="text-xs text-[#8d7d6a] font-mono tracking-wide mb-2 flex items-center">
                <Calendar className="h-3.5 w-3.5 mr-1 text-[#e67e22]" />
                <span>Drafted: {new Date(activeBoard.createdAt).toLocaleDateString()}</span>
                {activeBoard.imageUrl && (
                  <span className="bg-[#f5e6d3] text-[#2a1d15] border border-[#d1cbbd] text-[10px] px-1.5 py-0.2 rounded font-bold ml-2.5 uppercase tracking-wider">
                    Multimodal Derived
                  </span>
                )}
              </p>
              <p className="text-sm text-[#2d241e]/85 max-w-2xl leading-relaxed italic border-l-2 border-[#e67e22] pl-3">
                {activeBoard.description || "No board description formulated yet."}
              </p>
            </div>

            {/* Quick stats indicators */}
            <div className="no-print bg-white rounded-lg p-3 border border-[#d1cbbd] font-mono text-center shrink-0 w-full sm:w-auto shadow-sm">
              <span className="block text-[10px] tracking-wider text-[#8d7d6a] uppercase font-bold">Total Workflow Steps</span>
              <span className="block text-2xl font-serif font-black text-[#2a1d15]">{activeBoard.tasks.length}</span>
              <span className="block text-[10px] text-emerald-700 mt-1 font-bold uppercase">
                {activeBoard.tasks.filter(t => t.status === 'done').length} Completed
              </span>
            </div>
          </div>

          {/* High Fidelity PDF Header Overlay (Only visible in Print command) */}
          <div className="hidden print-header p-5 mb-6 border-b-2 border-stone-800">
            <h1 className="text-3xl font-bold font-display">{activeBoard.name}</h1>
            <p className="text-sm text-stone-500 mt-1">Printed on {new Date().toLocaleString()}</p>
            <p className="text-sm mt-3 italic text-stone-700">{activeBoard.description}</p>
          </div>

          {/* KANBAN BOARD LANES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {columnDefs.map(col => {
              const columnTasks = activeBoard.tasks.filter(t => t.status === col.id);
              
              return (
                <div 
                  key={col.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`rounded-xl p-4 pb-8 transition-colors relative min-h-[420px] flex flex-col ${
                    deskTheme === 'corkboard' 
                      ? 'bg-[#2a1d15]/5 border border-[#2a1d15]/10 shadow-inner' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  {/* Lane Title & Physical tag */}
                  <div className="flex items-center justify-between border-b border-[#2a1d15]/10 pb-2.5 mb-4">
                    <div className="flex flex-col">
                      <h3 className={`text-xs tracking-wider font-mono font-bold uppercase ${deskTheme === 'corkboard' ? 'text-[#2a1d15]' : 'text-stone-100'}`}>
                        {col.title}
                      </h3>
                      <span className={`text-[10px] leading-tight mt-0.5 ${deskTheme === 'corkboard' ? 'text-[#8d7d6a]' : 'text-stone-300/60'}`}>
                        {col.desc}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold shadow-sm ${
                      deskTheme === 'corkboard' 
                        ? 'bg-[#2a1d15] text-[#f5e6d3]' 
                        : 'bg-sky-600 text-white'
                    }`}>
                      {columnTasks.length}
                    </span>
                  </div>

                  {/* Add manual sticky button inside Lane */}
                  <button
                    onClick={() => openCreateTaskModal(col.id)}
                    className={`no-print w-full py-2 mb-4 rounded-lg text-xs font-mono font-semibold transition-all flex items-center justify-center border-2 border-dashed cursor-pointer ${
                      deskTheme === 'corkboard'
                        ? 'bg-white/60 hover:bg-white border-[#bca58d] hover:border-[#e67e22] text-[#8d7d6a] hover:text-[#2a1d15]'
                        : 'bg-white/5 hover:bg-white/10 border-white/20 text-stone-200'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Sticky
                  </button>

                  {/* Cards stack */}
                  <div className="space-y-4 flex-1">
                    {columnTasks.length === 0 ? (
                      <div className={`text-center py-10 rounded-lg text-xs ${deskTheme === 'corkboard' ? 'text-stone-700/60' : 'text-stone-300/30'}`}>
                        Drilled flat
                      </div>
                    ) : (
                      columnTasks.map(task => {
                        const styleMap = getStickyColorClasses(task.noteColor);
                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className={`task-card p-4 rounded shadow-sticky hover-sticky-lift select-none text-stone-900 flex flex-col relative transition-all cursor-grab active:cursor-grabbing ${styleMap.bg}`}
                            style={{ 
                              // Apply slight random physical rotation for skeuomorphic depth
                              transform: `rotate(${task.rotation}deg)` 
                            }}
                          >
                            {/* Visual Skeuomorphic Pins or Slate Clips — Natural Tones and Blueprint adapters */}
                            {deskTheme === 'corkboard' ? (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
                                <div className={`w-4.5 h-4.5 rounded-full shadow-inner border-2 ${
                                  task.noteColor === 'yellow' ? 'bg-red-600 border-red-800' :
                                  task.noteColor === 'pink' ? 'bg-blue-600 border-blue-800' :
                                  task.noteColor === 'blue' ? 'bg-yellow-500 border-yellow-700' :
                                  task.noteColor === 'green' ? 'bg-[#27ae60] border-emerald-800' : 
                                  'bg-[#e67e22] border-amber-800'
                                }`}></div>
                              </div>
                            ) : (
                              <div className="absolute -top-2 left-4 z-30 pointer-events-none">
                                {/* Metal Architect Clip */}
                                <div className="w-8 h-2.5 bg-stone-400 rounded-sm shadow border border-stone-500/30"></div>
                              </div>
                            )}

                            {/* Sticky Card Content */}
                            <div className="flex-1">
                              <h4 className="font-hand font-extrabold text-base tracking-wide leading-snug text-stone-950 pr-5 break-words">
                                {task.title}
                              </h4>
                              <p className="text-xs text-stone-800/80 font-sans mt-2 mb-3 leading-relaxed break-words line-clamp-3">
                                {task.description}
                              </p>

                              {/* Dependencies Lists if any */}
                              {task.dependencies && task.dependencies.length > 0 && (
                                <div className="mb-3 p-1.5 rounded text-[10px] font-mono leading-tight bg-stone-950/5 border border-stone-950/10">
                                  <div className="text-stone-600 font-bold uppercase text-[8px] mb-0.5">
                                    🔗 Waiting on:
                                  </div>
                                  <div className="space-y-0.5">
                                    {task.dependencies.map((dep, dIdx) => (
                                      <div key={dIdx} className="truncate">
                                        • {dep}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Sticky Footer Details */}
                            <div className="border-t border-stone-950/15 pt-2 mt-2 flex flex-col space-y-1.5">
                              
                              {/* Metadata indicators */}
                              <div className="flex items-center justify-between text-[10px] font-mono">
                                
                                {/* Assignee */}
                                <div className="flex items-center space-x-1 font-semibold truncate max-w-[120px]" title={task.assignee}>
                                  <User className="h-3 w-3 text-stone-600 shrink-0" />
                                  <span className="truncate">{task.assignee}</span>
                                </div>

                                {/* Deadline tag */}
                                <div className="flex items-center space-x-1 shrink-0 font-bold text-stone-700 bg-black/5 px-1 rounded">
                                  <Clock className="h-2.5 w-2.5 shrink-0" />
                                  <span>{task.deadline}</span>
                                </div>
                              </div>

                              {/* Priority & Quick Move Steering Controls */}
                              <div className="flex items-center justify-between pt-1 font-mono">
                                <span className={`text-[9px] uppercase font-bold border rounded px-1.5 py-0.2 ${getPriorityBadgeColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                
                                {/* Steering navigation */}
                                <div className="no-print flex space-x-1.5 opacity-60 hover:opacity-100 transition-opacity items-center">
                                  <button
                                    onClick={() => {
                                      setAssistantMessage(`Reading: ${task.title}`);
                                      speakText(`Task Title: ${task.title}. ${task.description ? 'Description: ' + task.description : ''} Assigned to: ${task.assignee || 'the general team'}. Deadline: ${task.deadline}. Priority is ${task.priority}.`);
                                    }}
                                    className="p-1 rounded bg-[#2a1d15]/5 hover:bg-[#2a1d15]/10 text-[#2a1d15]"
                                    title="Speak task details aloud"
                                  >
                                    <Volume2 className="h-3.5 w-3.5 text-[#e67e22]" />
                                  </button>
                                  <button
                                    onClick={() => openEditTaskModal(task)}
                                    className="p-1 rounded bg-stone-950/5 hover:bg-stone-950/10 text-[9px] uppercase font-bold"
                                    title="Edit Sticky"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => moveTaskStatus(task, 'backward')}
                                    className={`p-1 rounded bg-white/40 hover:bg-white text-stone-900 text-xs leading-none font-bold ${task.status === 'todo' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                    disabled={task.status === 'todo'}
                                    title="Move backward"
                                  >
                                    ‹
                                  </button>
                                  <button
                                    onClick={() => moveTaskStatus(task, 'forward')}
                                    className={`p-1 rounded bg-white/40 hover:bg-white text-stone-900 text-xs leading-none font-bold ${task.status === 'done' ? 'opacity-20 cursor-not-allowed' : ''}`}
                                    disabled={task.status === 'done'}
                                    title="Move forward"
                                  >
                                    ›
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-1 text-red-700 hover:text-red-900 rounded hover:bg-red-50"
                                    title="Discard task"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>

                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Interactive Project board connection strings details */}
          <div className="mt-8 no-print bg-[#fcfcf9]/95 rounded-xl p-4 border border-stone-300 flex items-center justify-between shadow-md">
            <div className="flex items-center space-x-3 text-stone-700">
              <span className="text-2xl">💡</span>
              <p className="text-xs leading-relaxed font-mono">
                <strong className="text-stone-900">Task Dependency Link Engine</strong>: Pinned task cards hold functional arrows based on the list of titles you configure inside stickies. Drag them across columns dynamically to adjust your roadmap progress.
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* PORTFOLIO ACCORDION: Spiral Binder Ledger (Tactile Notebook of stats) */}
      {ledgerOpen && (
        <section className="no-print fixed inset-y-0 right-0 w-full sm:w-[480px] bg-stone-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-[430px] bg-[#f7f5e8] border-l-8 border-yellow-700/50 shadow-2xl overflow-y-auto flex flex-col relative texture-ruled-paper">
            
            {/* Skeuomorphic binder ring header — Natural Tones palette */}
            <div className="p-4 bg-[#2a1d15] text-[#f5e6d3] flex items-center justify-between border-b-4 border-[#4d3a2b]">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-[#e67e22]" />
                <h2 className="text-sm font-serif font-black uppercase tracking-wider m-0">Studio Project Ledger</h2>
              </div>
              <button 
                onClick={() => setLedgerOpen(false)}
                className="text-[#2a1d15] hover:text-[#2a1d15] font-mono text-xs font-bold bg-[#f5e6d3] hover:bg-white py-1 px-3 rounded-full shadow transition-all"
              >
                Close pad ✕
              </button>
            </div>

            {/* Simulated notebook pages margins spiral */}
            <div className="flex-1 p-6 relative">
              {/* Binder wire rings illustration along left margin */}
              <div className="absolute top-0 bottom-0 left-1 w-4 flex flex-col justify-around py-4 pointer-events-none z-10">
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} className="w-8 h-2 bg-stone-400/90 rounded-full border border-stone-600 shadow -ml-4"></div>
                ))}
              </div>

              <div className="pl-6">
                <div className="border-b-2 border-dashed border-stone-400 pb-3 mb-6">
                  <span className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest block">Ledger Status</span>
                  <h3 className="text-2xl font-display font-black text-stone-900">Weekly Progress Report</h3>
                  <p className="text-xs text-stone-500 font-mono mt-1">Aggregated statistics across active workspaces</p>
                </div>

                <div className="space-y-6">
                  {getWeeklyLedgerSummary().map((sum, sumIdx) => {
                    const percent = sum.totalTasks > 0 ? Math.round((sum.completedTasks / sum.totalTasks) * 100) : 0;
                    return (
                      <div key={sum.projectId} className="bg-white/60 p-4 border border-stone-300 rounded shadow-sm relative">
                        <div className="absolute top-4 right-4 text-[10px] font-mono px-1.5 py-0.5 bg-stone-200 rounded font-bold">
                          #{sumIdx + 1}
                        </div>

                        <h4 className="text-base font-display font-bold text-stone-900 mb-1">
                          {sum.projectName}
                        </h4>

                        {/* Bar progress ledger */}
                        <div className="mt-3 font-mono text-xs">
                          <div className="flex justify-between mb-1 text-[11px] font-bold">
                            <span>RESOLVED VALUE:</span>
                            <span className="text-emerald-700">{percent}% ({sum.completedTasks}/{sum.totalTasks})</span>
                          </div>
                          <div className="w-full bg-stone-200 h-2 rounded overflow-hidden shadow-inner border border-stone-300">
                            <div className="bg-emerald-600 h-full transition-all duration-300" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>

                        {/* Summary counter grid */}
                        <div className="grid grid-cols-3 gap-2 mt-4 font-mono text-xs text-center">
                          <div className="bg-stone-100 p-2 border rounded">
                            <span className="block text-[10px] text-stone-500">Total</span>
                            <span className="font-bold">{sum.totalTasks}</span>
                          </div>
                          <div className="bg-emerald-50 p-2 border border-emerald-200 rounded text-emerald-800">
                            <span className="block text-[10px] text-emerald-600">Pending</span>
                            <span className="font-bold">{sum.pendingTasks}</span>
                          </div>
                          <div className="bg-blue-50 p-2 border border-blue-200 rounded text-blue-800">
                            <span className="block text-[10px] text-blue-600">Complete</span>
                            <span className="font-bold">{sum.completedTasks}</span>
                          </div>
                        </div>

                        {/* Short pending checklist */}
                        <div className="mt-4 pt-4 border-t border-dashed border-stone-300">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block mb-1.5 font-mono">Action Item Log:</span>
                          {sum.tasksList.length === 0 ? (
                            <p className="text-[11px] text-stone-500 font-mono italic">No items identified.</p>
                          ) : (
                            <div className="space-y-1">
                              {sum.tasksList.slice(0, 4).map(tl => (
                                <div key={tl.id} className="flex items-center text-[11px] font-mono justify-between text-stone-700">
                                  <span className="truncate max-w-[200px]">
                                    {tl.status === 'done' ? '✓' : '•'} {tl.title}
                                  </span>
                                  <span className={`px-1 rounded text-[9px] uppercase shrink-0 font-bold ${tl.status === 'done' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                    {tl.status}
                                  </span>
                                </div>
                              ))}
                              {sum.tasksList.length > 4 && (
                                <p className="text-[10px] text-stone-400 font-mono italic pt-1 flex items-center justify-center">
                                  <span>+ {sum.tasksList.length - 4} other board stickies cataloged</span>
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Print helper section inside Notebook pad */}
                <div className="mt-8 bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-inner font-mono text-[11px] leading-relaxed text-amber-900">
                  <h5 className="font-bold flex items-center text-xs mb-1">
                    <CheckCircle className="h-4 w-4 mr-1 text-emerald-600" />
                    Ledger Sync active
                  </h5>
                  <p>Weekly summaries are gathered sequentially from local browser cache memory. Create multiple boards using different whiteboard sketches to visualize parallel roadmaps!</p>
                </div>
              </div>

            </div>

          </div>
        </section>
      )}

      {/* FOOTER — Natural Tones Architect Edition */}
      <footer className="no-print h-auto md:h-12 py-3 md:py-0 bg-[#2a1d15] px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-[10px] text-[#bca58d] uppercase tracking-widest border-t border-[#4d3a2b] shadow-xl space-y-2 md:space-y-0">
        <p className="font-semibold">Last Sync: Live Now</p>
        <p className="font-bold text-[#f5e6d3] text-center">© 2024 FlowScribe — Architect Edition</p>
        <div className="flex gap-4 items-center font-mono">
          <span>Storage: 4.2GB / 10GB</span>
          <span className="text-[#e67e22] animate-pulse">● Multimodal Engine Ready</span>
        </div>
      </footer>

      {/* STICKY EDITING MODAL (TACTILE PIN CARD POPUP) — Natural Tones styling */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-[#2a1d15]/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print" id="task-dialog">
          <div className="bg-[#fdfcf9] rounded-xl shadow-2xl max-w-md w-full p-6 border-b-8 border-[#e67e22] relative transform rotate-1 flex flex-col font-mono text-xs text-[#2d241e]">
            
            {/* Modal Pushpin Design */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-35 pointer-events-none">
              <div className="w-4.5 h-4.5 rounded-full bg-red-650 border-2 border-red-800 shadow-md"></div>
            </div>

            <div className="flex items-center justify-between border-b border-[#d1cbbd] pb-3 mb-4">
              <h3 className="font-serif font-black text-sm tracking-tight text-[#2a1d15] m-0">
                {modalMode === 'create' ? '📌 PIN NEW WORKFLOW STEP' : '📝 ORGANIZE STICKY NOTE'}
              </h3>
              <button 
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="text-stone-704 hover:text-[#2a1d15] font-bold"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-4">
              
              <div>
                <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Sticky Title *</label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Set up OAuth Callback routes"
                  className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                  required
                  id="modal-task-title"
                />
              </div>

              <div>
                <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Action Steps / Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Details detailing code file locations or engineering plans"
                  className="w-full p-2 h-20 border border-stone-950/25 bg-white/70 rounded resize-none focus:outline-none focus:ring-1 focus:ring-stone-600"
                  id="modal-task-desc"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Owner / Assignee</label>
                  <input
                    type="text"
                    value={taskForm.assignee}
                    onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                    placeholder="e.g. Lead Designer"
                    className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                    id="modal-task-assignee"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Target Deadline</label>
                  <input
                    type="text"
                    value={taskForm.deadline}
                    onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    placeholder="e.g. In 2 days"
                    className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                    id="modal-task-deadline"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Priority Level</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold mb-1 uppercase text-stone-800 text-[10px]">Aesthetic Color</label>
                  <select
                    value={taskForm.noteColor}
                    onChange={(e) => setTaskForm({ ...taskForm, noteColor: e.target.value as any })}
                    className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                  >
                    <option value="yellow">💛 Yellow stickie</option>
                    <option value="pink">💖 Pink stickie</option>
                    <option value="blue">💙 Blue stickie</option>
                    <option value="green">💚 Green stickie</option>
                    <option value="orange">🧡 Orange stickie</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-0.5 uppercase text-stone-800 text-[10px] flex items-center justify-between">
                  <span>🔗 Task Dependency Links</span>
                  <span className="text-[9px] text-stone-500 font-normal">Comma separated list</span>
                </label>
                <input
                  type="text"
                  value={taskForm.dependencies}
                  onChange={(e) => setTaskForm({ ...taskForm, dependencies: e.target.value })}
                  placeholder="e.g. Design wireframes, Install LED lights"
                  className="w-full p-2 border border-stone-950/25 bg-white/70 rounded focus:outline-none focus:ring-1 focus:ring-stone-600"
                  id="modal-task-dependencies"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="w-1/2 p-2.5 rounded-lg bg-[#e8e4d9] hover:bg-[#d1cbbd] text-[#2d241e] font-bold text-[10px] uppercase tracking-wider border border-[#d1cbbd]"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="w-1/2 p-2.5 rounded-lg bg-[#e67e22] hover:bg-[#d35400] text-white font-bold text-[10px] uppercase tracking-wider shadow-sm transition-colors"
                  id="btn-modal-submit font-mono font-bold"
                >
                  {modalMode === 'create' ? 'Pin Sticky Task' : 'Save Changes'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

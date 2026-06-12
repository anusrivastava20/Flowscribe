import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize the Gemini SDK safely at runtime
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const app = express();
const PORT = 3000;

// Set high limits for receiving image/video base64 payloads safely
app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ limit: "60mb", extended: true }));

// Mock in-memory storage for shared boards to support "shareable link" feature
// Note: client side state will primarily reside in localStorage to persist across updates,
// but sharing a link will store it here so another user or tab can load it!
interface SharedBoard {
  id: string;
  name: string;
  description: string;
  tasks: any[];
  createdAt: string;
}
const sharedBoards: Record<string, SharedBoard> = {};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Share a board (saves to in-memory store)
app.post("/api/boards/share", (req, res) => {
  const { id, name, description, tasks } = req.body;
  if (!id) {
    return res.status(400).json({ error: "Missing board ID" });
  }
  sharedBoards[id] = {
    id,
    name: name || "Untitled Workflow",
    description: description || "",
    tasks: tasks || [],
    createdAt: new Date().toISOString()
  };
  res.json({ success: true, shareId: id });
});

// Retrieve a shared board
app.get("/api/boards/share/:id", (req, res) => {
  const board = sharedBoards[req.params.id];
  if (!board) {
    return res.status(404).json({ error: "Workflow board not found" });
  }
  res.json(board);
});

// Multimodal flow mapping whiteboard visual inputs to structured JSON
app.post("/api/analyze", async (req, res) => {
  try {
    const { base64, mimeType, projectNotes } = req.body;

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: "Missing required file content or mimeType" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured. Please add it in the Secrets panel." 
      });
    }

    // Clean base64 input (remove prefix if present)
    const base64Data = base64.replace(/^data:.*;base64,/, "");

    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const notesText = projectNotes 
      ? `\n\nAdditional User Context & Guidelines for this project:\n"${projectNotes}"` 
      : "";

    const userPrompt = `You are FlowScribe, an expert visual analyst and project manager. 
Analyze this whiteboard photo, hand-drawn flowchart, mind map, design layout, or screenshot.
Perform the following:
1. Extract or determine an elegant, concise project name/title.
2. Formulate a summary/description of this project based on the visual layout and content.
3. Identify all tasks, goals, or items described. For each item, extract or suggest:
   - Clear title and high-quality description mapping logical steps.
   - Owner/Assignee: Extract names (e.g. Bob, Alice) if explicitly drawn, otherwise suggest professional titles (e.g., UI/UX Designer, Lead Developer, QA Specialist).
   - Priority: 'low', 'medium', or 'high', based on layout stars/exclamation spots or importance in the flow.
   - Status: Detect columns (like "ToDo", "Doing", "Done") to place them in 'todo', 'inprogress', 'review', or 'done'. Default to 'todo' if ambiguous.
   - Deadline: Suggest a realistic timeline relative to today (e.g. 'Next Monday', '2 days', '1 week').
   - Dependencies: Detect connecting lines or flows. Write the list of other task titles that this task depends on (must be resolved first).

Be highly analytical and capture as much rich details as possible.${notesText}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        filePart,
        { text: userPrompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            projectName: {
              type: Type.STRING,
              description: "The name of the project extracted or generated from the visual."
            },
            projectDescription: {
              type: Type.STRING,
              description: "A compact summary explaining what the project aims to accomplish."
            },
            tasks: {
              type: Type.ARRAY,
              description: "List of tasks derived from the visual content.",
              items: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "Explicit task name or action item."
                  },
                  description: {
                    type: Type.STRING,
                    description: "Elaborated action steps or details for how to carry out this specific item."
                  },
                  assignee: {
                    type: Type.STRING,
                    description: "Responsible member name or recommended role (e.g., 'Lead Developer', 'Designer')."
                  },
                  priority: {
                    type: Type.STRING,
                    description: "Urgency mapping: 'high', 'medium', or 'low'.",
                    enum: ["high", "medium", "low"]
                  },
                  status: {
                    type: Type.STRING,
                    description: "Initial workflow status.",
                    enum: ["todo", "inprogress", "review", "done"]
                  },
                  deadline: {
                    type: Type.STRING,
                    description: "Estimated target timeframe based on general project size or written labels."
                  },
                  dependencies: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.STRING
                    },
                    description: "List of other extracted task titles that must precede this task."
                  },
                  noteColor: {
                    type: Type.STRING,
                    description: "Suggested sticky note aesthetic color to symbolize categorization or status.",
                    enum: ["yellow", "pink", "blue", "green", "orange"]
                  }
                },
                required: ["title", "description", "assignee", "priority", "status", "deadline"]
              }
            }
          },
          required: ["projectName", "projectDescription", "tasks"]
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No output generated from Gemini API");
    }

    const workflowData = JSON.parse(outputText.trim());
    res.json(workflowData);

  } catch (error: any) {
    console.error("Gemini Multimodal Analysis Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to analyze the uploaded media. Please try again." 
    });
  }
});

// Live server initialization combined with Vite's dev middlewares or serving static builds
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FlowScribe Server] Listening on http://localhost:${PORT}`);
  });
}

startServer();

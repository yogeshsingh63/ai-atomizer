// Type definitions matching database models

export type SourceType = 'youtube_url' | 'upload' | 'article_text';
export type ProjectStatus = 'pending' | 'transcribing' | 'extracting' | 'generating' | 'done' | 'failed';
export type AssetType = 'blog' | 'thread' | 'linkedin' | 'clip' | 'thumbnail';
export type AssetState = 'pending' | 'done' | 'failed';

export interface Project {
  id: number;
  title: string;
  source_type: SourceType;
  source_ref: string;
  status: ProjectStatus;
  default_model_mode: 'auto' | 'pinned';
  default_pinned_model: string | null;
  created_at: string;
}

export interface TranscriptSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export interface Transcript {
  id: number;
  project_id: number;
  full_text: string;
  segments: TranscriptSegment[];
}

export interface Highlight {
  id: number;
  project_id: number;
  start_seconds: number;
  end_seconds: number;
  quote: string;
  reason: string;
}

export interface GeneratedAsset {
  id: number;
  project_id: number;
  asset_type: AssetType;
  content: string; // Text content or image path
  related_highlight_id: number | null;
  model_used: string;
  status: AssetState;
  created_at: string;
}

export interface Job {
  id: number;
  project_id: number;
  stage: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message: string | null;
  model_used: string | null;
  updated_at: string;
}

export interface Model {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  is_free: boolean;
}

// API Configurations
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// In-memory mock database state for frontend-only demo
let mockProjects: Project[] = [];
let mockAssets: Record<number, GeneratedAsset[]> = {};
let mockHighlights: Record<number, Highlight[]> = {};

// Prepopulated models list
const MOCK_MODELS: Model[] = [
  { id: 'auto', name: 'Auto (free, fastest)', pricing: { prompt: '0', completion: '0' }, is_free: true },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', pricing: { prompt: '0', completion: '0' }, is_free: true },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true },
  { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3 (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Paid)', pricing: { prompt: '0.003', completion: '0.015' }, is_free: false },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (Paid)', pricing: { prompt: '0.00125', completion: '0.00375' }, is_free: false },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Paid)', pricing: { prompt: '0.00055', completion: '0.00219' }, is_free: false },
];

// Helper to check if backend is running
async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

export async function getModels(): Promise<Model[]> {
  if (await isBackendOnline()) {
    try {
      const res = await fetch(`${BACKEND_URL}/models`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch models from backend, falling back to mock:', e);
    }
  }
  return MOCK_MODELS;
}

export async function createProject(data: {
  title: string;
  source_type: SourceType;
  source_ref: string;
  default_model_mode: 'auto' | 'pinned';
  default_pinned_model: string | null;
  file?: File;
}): Promise<{ project_id: number }> {
  // If backend is active
  if (await isBackendOnline()) {
    try {
      if (data.source_type === 'upload' && data.file) {
        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('source_type', data.source_type);
        formData.append('file', data.file);
        formData.append('default_model_mode', data.default_model_mode);
        if (data.default_pinned_model) formData.append('default_pinned_model', data.default_pinned_model);

        const res = await fetch(`${BACKEND_URL}/projects`, {
          method: 'POST',
          body: formData,
        });
        if (res.ok) return await res.json();
      } else {
        const res = await fetch(`${BACKEND_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: data.title,
            source_type: data.source_type,
            source_ref: data.source_ref,
            default_model_mode: data.default_model_mode,
            default_pinned_model: data.default_pinned_model,
          }),
        });
        if (res.ok) return await res.json();
      }
    } catch (e) {
      console.warn('Failed to post project to backend, using mock:', e);
    }
  }

  // Frontend-only Mock pipeline execution
  const projectId = Math.floor(Math.random() * 900000) + 100000;
  const newProject: Project = {
    id: projectId,
    title: data.title || (data.source_type === 'youtube_url' ? 'YouTube Content' : 'Pasted Article'),
    source_type: data.source_type,
    source_ref: data.source_type === 'upload' ? data.file?.name || 'uploaded-file.mp3' : data.source_ref,
    status: 'pending',
    default_model_mode: data.default_model_mode,
    default_pinned_model: data.default_pinned_model,
    created_at: new Date().toISOString(),
  };

  mockProjects.push(newProject);
  
  // Set up mock content that will be populated after processing
  setupMockProjectData(projectId, data.title, data.source_type);

  return { project_id: projectId };
}

export async function getProject(id: number): Promise<Project> {
  if (await isBackendOnline()) {
    try {
      const res = await fetch(`${BACKEND_URL}/projects/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`Failed to fetch project ${id} from backend, using mock:`, e);
    }
  }

  const p = mockProjects.find(item => item.id === id);
  if (!p) {
    // If refreshed/loaded directly, auto-generate project
    const autoProj: Project = {
      id,
      title: 'Repurposed Content Demo',
      source_type: 'article_text',
      source_ref: 'Mock Ref',
      status: 'done',
      default_model_mode: 'auto',
      default_pinned_model: null,
      created_at: new Date().toISOString(),
    };
    mockProjects.push(autoProj);
    setupMockProjectData(id, autoProj.title, autoProj.source_type);
    return autoProj;
  }
  return p;
}

export async function getHighlights(id: number): Promise<Highlight[]> {
  if (await isBackendOnline()) {
    try {
      const res = await fetch(`${BACKEND_URL}/projects/${id}/highlights`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch highlights from backend, using mock:', e);
    }
  }
  return mockHighlights[id] || [];
}

export async function getAssets(id: number): Promise<GeneratedAsset[]> {
  if (await isBackendOnline()) {
    try {
      const res = await fetch(`${BACKEND_URL}/projects/${id}/assets`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch assets from backend, using mock:', e);
    }
  }
  return mockAssets[id] || [];
}

export async function regenerateAsset(id: number, assetId: number, model: string | null): Promise<GeneratedAsset> {
  if (await isBackendOnline()) {
    try {
      const res = await fetch(`${BACKEND_URL}/projects/${id}/assets/${assetId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to regenerate asset on backend, using mock:', e);
    }
  }

  const assets = mockAssets[id] || [];
  const index = assets.findIndex(a => a.id === assetId);
  if (index !== -1) {
    const asset = assets[index];
    const modelUsed = model || 'google/gemini-2.5-flash';
    const updated: GeneratedAsset = {
      ...asset,
      status: 'done',
      model_used: modelUsed,
      content: getRegeneratedContentMock(asset.asset_type, modelUsed),
    };
    assets[index] = updated;
    mockAssets[id] = assets;
    return updated;
  }
  throw new Error('Asset not found');
}

// Subscribe to progress stream via SSE
export function subscribeToEvents(
  id: number,
  onEvent: (event: { stage: string; status: string; model_used: string | null; error_message: string | null }) => void,
  onError: () => void,
  onComplete: () => void
): () => void {
  // Check if we should use mock SSE or real backend
  let isMock = true;
  let eventSource: EventSource | null = null;
  let timeoutId: any = null;

  isBackendOnline().then(online => {
    if (online) {
      isMock = false;
      eventSource = new EventSource(`${BACKEND_URL}/projects/${id}/events`);
      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        onEvent(data);
        if (data.stage === 'done' || data.status === 'completed') {
          eventSource?.close();
          onComplete();
        }
        if (data.status === 'failed') {
          eventSource?.close();
          onError();
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        onError();
      };
    } else {
      // Mock SSE execution
      runMockPipelineFlow(id, onEvent, onComplete);
    }
  });

  return () => {
    if (eventSource) {
      eventSource.close();
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
}

// --- Internal Mock Data Generation ---

function setupMockProjectData(projectId: number, title: string, sourceType: SourceType) {
  mockHighlights[projectId] = [
    {
      id: 1,
      project_id: projectId,
      start_seconds: 12,
      end_seconds: 45,
      quote: "The secret to building extremely engaging AI apps is to focus on micro-interactions. A button that glows, a grid that rotates, a smooth hover transition - these details make users love the tool.",
      reason: "Actionable concrete design advice for frontend builders."
    },
    {
      id: 2,
      project_id: projectId,
      start_seconds: 78,
      end_seconds: 122,
      quote: "Most startups fail not because their technology isn't advanced, but because their user experience is generic. If your tool feels like a standard Bootstrap template, you have already lost.",
      reason: "Strong hook regarding UX importance for startup success."
    },
    {
      id: 3,
      project_id: projectId,
      start_seconds: 190,
      end_seconds: 240,
      quote: "OpenRouter's free fallback chain is a game changer. By simply supplying an array of 5 free models, your app automatically rotates and handles rate limits without writing complex logic.",
      reason: "Concrete technical tip on managing LLM reliability."
    }
  ];

  mockAssets[projectId] = [
    {
      id: 101,
      project_id: projectId,
      asset_type: 'blog',
      content: `# Crafting Interfaces That Wow: The UI Secrets of Top AI Apps

In the rapidly evolving landscape of generative AI, functionality is becoming a commodity. Anyone can make an API call. The true battleground has shifted to **User Experience (UX)**. 

During our recent session on modern application building, we unpacked the visual design systems that differentiate mediocre products from premium, high-retention software. Here are the core strategies.

## 1. Focus on Micro-Interactions
Engaging interfaces aren't just pretty layouts; they are responsive and alive. A border that sweeps around a card on hover, a gradient that tracks the user's cursor, or a subtle decode animation on page load. These details indicate premium craftsmanship.

> "The secret to building extremely engaging AI apps is to focus on micro-interactions. A button that glows, a grid that rotates, a smooth hover transition - these details make users love the tool."

## 2. Ditch the Generic Templates
Many founders rush to launch with generic CSS frames. While this helps validate an MVP, it establishes a negative first impression. High-end products use curated, harmonious color palettes (often tailored HSL color spaces) rather than browser-standard reds and blues.

## 3. Leverage Provider Fallbacks
From a technical reliability standpoint, user satisfaction drops to zero if the app returns a rate-limit error. Chaining zero-price API endpoints ensures high uptime while testing ideas, providing a large effective quota for early adopters.

*Premium design is not decorative; it is functional.*`,
      related_highlight_id: null,
      model_used: 'meta-llama/llama-3.3-70b-instruct:free',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      project_id: projectId,
      asset_type: 'thread',
      content: `1/ Generative AI is democratizing backend capability. 

If anyone can wire up an LLM, where is the competitive moat?

It's the User Experience. Here is a thread on the UX secrets of premium AI products. 👇

2/ Micro-interactions are the heartbeat of an app.

A button with an active hover gradient.
A bento grid with 3D depth cards.
A text decoder reveal effect.

These micro-animations signal quality and encourage user engagement.

3/ UX is not just colors; it is reliability.

Rate limits can kill user trust instantly. Using fallback arrays like those offered on OpenRouter allows your app to rotate models transparently. High uptime = high trust.

4/ Avoid generic Bootstrap or Tailwind templates. 

If your design feels stock, users assume your engine is stock too. Invest in tailored HSL palettes, outfit typography, and clean glassmorphism.

5/ Takeaway: premium design is not decorative; it is functional. Visual wow-factors keep users coming back and justify premium pricing.

What's your favorite micro-interaction in modern web apps? Let me know below!`,
      related_highlight_id: null,
      model_used: 'deepseek/deepseek-chat:free',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 103,
      project_id: projectId,
      asset_type: 'linkedin',
      content: `If anyone can call an LLM API, where is the product moat?

The answer is simple: User Experience.

Standard dashboards and generic visual layouts are the fastest way to get ignored. Premium applications differentiate themselves by building custom, responsive interfaces that feel alive. 

Key takeaways for product builders:
1. Micro-interactions matter: Smooth hover transitions, interactive cards, and text reveals build massive user engagement.
2. Rely on developer resilience: Combine API endpoints with fallback options to guarantee near-100% uptime.
3. Design communicates value: Harmonious palettes and modern typography command higher value than default layouts.

Moats are no longer built in the database; they are built in the interface.

#UXDesign #GenerativeAI #ProductManagement #Frontend`,
      related_highlight_id: null,
      model_used: 'qwen/qwen-2.5-72b-instruct:free',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 104,
      project_id: projectId,
      asset_type: 'clip',
      content: `**Clip 1 (12s - 45s)**
- **Caption:** The absolute secret to making users fall in love with your AI application.
- **On-Screen Text:** FOCUS ON MICRO-INTERACTIONS`,
      related_highlight_id: 1,
      model_used: 'google/gemini-2.5-flash',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 105,
      project_id: projectId,
      asset_type: 'clip',
      content: `**Clip 2 (78s - 122s)**
- **Caption:** Why standard UX layouts are holding your startup back from growth.
- **On-Screen Text:** AVOID GENERIC TEMPLATES`,
      related_highlight_id: 2,
      model_used: 'google/gemini-2.5-flash',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 106,
      project_id: projectId,
      asset_type: 'thumbnail',
      content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', // A premium abstract 3D asset placeholder for mock
      related_highlight_id: null,
      model_used: 'google/gemini-2.5-flash',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 107,
      project_id: projectId,
      asset_type: 'thumbnail',
      content: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=600&auto=format&fit=crop',
      related_highlight_id: 1,
      model_used: 'google/gemini-2.5-flash',
      status: 'done',
      created_at: new Date().toISOString()
    }
  ];
}

function getRegeneratedContentMock(type: AssetType, model: string): string {
  return `[Regenerated with ${model}]

Here is your updated ${type} asset. We've refined the styling and adjusted the voice tone to sound more professional and direct.

- Cut filler statements.
- Tailored formatting for standard readability.
- Re-grounded arguments in transcript quotes.

Enjoy the fresh draft!`;
}

function runMockPipelineFlow(
  projectId: number,
  onEvent: (event: any) => void,
  onComplete: () => void
) {
  const stages = [
    { name: 'Transcribing Audio', duration: 3000 },
    { name: 'Extracting Highlights', duration: 4000 },
    { name: 'Generating Assets', duration: 4500 },
    { name: 'Running Critic Review', duration: 3500 },
    { name: 'Generating Thumbnails', duration: 3000 }
  ];

  let currentStageIndex = 0;

  function runNextStage() {
    if (currentStageIndex < stages.length) {
      const stage = stages[currentStageIndex];
      onEvent({
        stage: stage.name,
        status: 'running',
        model_used: currentStageIndex > 1 ? 'meta-llama/llama-3.3-70b-instruct:free' : null,
        error_message: null
      });

      setTimeout(() => {
        onEvent({
          stage: stage.name,
          status: 'completed',
          model_used: currentStageIndex > 1 ? 'meta-llama/llama-3.3-70b-instruct:free' : null,
          error_message: null
        });
        currentStageIndex++;
        runNextStage();
      }, stage.duration);
    } else {
      const proj = mockProjects.find(p => p.id === projectId);
      if (proj) {
        proj.status = 'done';
      }
      onComplete();
    }
  }

  runNextStage();
}

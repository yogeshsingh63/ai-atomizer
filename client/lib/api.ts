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
  target_assets: string | null; // JSON array string of asset types
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
  provider: string; // auto | nvidia | gemini | openrouter | groq
}

// API Configurations
const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const BACKEND_URL = `${BACKEND_BASE}/api`;

// Resolve image URLs stored in the DB to a browser-loadable absolute URL.
// Backend-saved thumbnails are stored as relative paths like "/generated/9/blog_cover.png"
// and served from the backend origin (port 8000). Without this, the browser resolves
// them against the frontend origin (port 3000) and 404s. Absolute URLs (http/https/data)
// are returned as-is.
export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  // Relative path served by the backend static mount
  return `${BACKEND_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

// Authentication helpers
export function redirectToGoogleLogin() {
  if (typeof window !== 'undefined') {
    window.location.href = `${BACKEND_URL}/auth/google`;
  }
}

export async function loginAsGuest(): Promise<{ access_token: string; user: any }> {
  const res = await fetch(`${BACKEND_URL}/auth/guest`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to login as guest');
  }
  const data = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem('prism_token', data.access_token);
  }
  return data;
}

export function getStoredToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('prism_token');
  }
  return null;
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('prism_token');
  }
}

function getAuthHeaders(contentType?: string): HeadersInit {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('prism_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

// In-memory mock database state for frontend-only demo
let mockProjects: Project[] = [];
let mockAssets: Record<number, GeneratedAsset[]> = {};
let mockHighlights: Record<number, Highlight[]> = {};

// Prepopulated models list (mirrors backend fallback, grouped by provider)
const MOCK_MODELS: Model[] = [
  { id: 'auto', name: 'Auto (free, fastest)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'auto' },
  { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (NVIDIA NIM)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'nvidia' },
  { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B (NVIDIA NIM)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'nvidia' },
  { id: 'meta/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B (NVIDIA NIM)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'nvidia' },
  { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B (NVIDIA NIM)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'nvidia' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'gemini' },
  { id: 'google/gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'gemini' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'openrouter' },
  { id: 'deepseek/deepseek-chat:free', name: 'DeepSeek V3 (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'openrouter' },
  { id: 'qwen/qwen-2.5-72b-instruct:free', name: 'Qwen 2.5 72B (Free)', pricing: { prompt: '0', completion: '0' }, is_free: true, provider: 'openrouter' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Paid)', pricing: { prompt: '0.003', completion: '0.015' }, is_free: false, provider: 'openrouter' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro (Paid)', pricing: { prompt: '0.00125', completion: '0.00375' }, is_free: false, provider: 'openrouter' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Paid)', pricing: { prompt: '0.00055', completion: '0.00219' }, is_free: false, provider: 'openrouter' },
];

// Helper to check if backend is running
async function isBackendOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}/health`, { signal: AbortSignal.timeout(1000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

// Explicit demo mode — only enabled via ?demo=1 URL param. Prevents the
// frontend from silently showing fake data when the backend is briefly
// unavailable (which caused mock data to leak into the real UI).
function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("demo");
}

// fetchWithRetry — retries a fetch up to `retries` times with short delays
// to absorb transient backend drops (e.g. uvicorn --reload restarts).
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  let lastErr: unknown = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      // Don't retry on 4xx (client errors) — only on network errors and 5xx
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (i < retries) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetchWithRetry failed");
}

export async function getModels(): Promise<Model[]> {
  if (isDemoMode()) return MOCK_MODELS;
  const res = await fetchWithRetry(`${BACKEND_URL}/models`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error(`Failed to load models (HTTP ${res.status})`);
  return await res.json();
}

export async function createProject(data: {
  title: string;
  source_type: SourceType;
  source_ref: string;
  default_model_mode: 'auto' | 'pinned';
  default_pinned_model: string | null;
  target_assets?: string[]; // array of asset types to generate
  file?: File;
}): Promise<{ project_id: number }> {
  // Demo mode only — no silent mock fallback on transient errors.
  if (isDemoMode()) {
    const projectId = Math.floor(Math.random() * 900000) + 100000;
    const newProject: Project = {
      id: projectId,
      title: data.title || (data.source_type === 'youtube_url' ? 'YouTube Content' : 'Pasted Article'),
      source_type: data.source_type,
      source_ref: data.source_type === 'upload' ? data.file?.name || 'uploaded-file.mp3' : data.source_ref,
      status: 'pending',
      default_model_mode: data.default_model_mode,
      default_pinned_model: data.default_pinned_model,
      target_assets: data.target_assets ? JSON.stringify(data.target_assets) : null,
      created_at: new Date().toISOString(),
    };
    mockProjects.push(newProject);
    setupMockProjectData(projectId, data.title, data.source_type);
    return { project_id: projectId };
  }

  // Build FormData and POST to backend. No silent mock fallback.
  const formData = new FormData();
  formData.append('title', data.title);
  formData.append('source_type', data.source_type);
  formData.append('default_model_mode', data.default_model_mode);
  if (data.source_ref) formData.append('source_ref', data.source_ref);
  if (data.default_pinned_model) formData.append('default_pinned_model', data.default_pinned_model);
  if (data.target_assets && data.target_assets.length > 0) {
    formData.append('target_assets', JSON.stringify(data.target_assets));
  }
  if (data.file) formData.append('file', data.file);

  const res = await fetchWithRetry(
    `${BACKEND_URL}/projects`,
    { method: 'POST', headers: getAuthHeaders(), body: formData }
  );
  if (!res.ok) throw new Error(`Project creation failed (HTTP ${res.status})`);
  return await res.json();
}

export async function getProject(id: number): Promise<Project> {
  if (isDemoMode()) {
    // Explicit demo mode only — never fall back to mock on transient errors.
    return getMockProject(id);
  }
  // No silent mock fallback — throw a clear error if the backend is down.
  const res = await fetchWithRetry(
    `${BACKEND_URL}/projects/${id}?t=${Date.now()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error(`Failed to load project ${id} (HTTP ${res.status})`);
  return await res.json();
}

function getMockProject(id: number): Project {
  const p = mockProjects.find(item => item.id === id);
  if (p) return p;
  const autoProj: Project = {
    id,
    title: 'Repurposed Content Demo',
    source_type: 'article_text',
    source_ref: 'Mock Ref',
    status: 'done',
    default_model_mode: 'auto',
    default_pinned_model: null,
    target_assets: null,
    created_at: new Date().toISOString(),
  };
  mockProjects.push(autoProj);
  setupMockProjectData(id, autoProj.title, autoProj.source_type);
  return autoProj;
}

export async function getHighlights(id: number): Promise<Highlight[]> {
  if (isDemoMode()) return mockHighlights[id] || [];
  const res = await fetchWithRetry(
    `${BACKEND_URL}/projects/${id}/highlights?t=${Date.now()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error(`Failed to load highlights for project ${id} (HTTP ${res.status})`);
  return await res.json();
}

export async function getAssets(id: number): Promise<GeneratedAsset[]> {
  if (isDemoMode()) return mockAssets[id] || [];
  const res = await fetchWithRetry(
    `${BACKEND_URL}/projects/${id}/assets?t=${Date.now()}`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error(`Failed to load assets for project ${id} (HTTP ${res.status})`);
  return await res.json();
}

export async function regenerateAsset(
  id: number,
  assetId: number,
  options: { model?: string | null; prompt?: string | null; model_mode?: string | null } = {}
): Promise<GeneratedAsset> {
  const { model = null, prompt = null, model_mode = null } = options;
  if (isDemoMode()) {
    return regenerateAssetMock(id, assetId, model);
  }
  const res = await fetchWithRetry(
    `${BACKEND_URL}/projects/${id}/assets/${assetId}/regenerate`,
    {
      method: 'POST',
      headers: getAuthHeaders('application/json'),
      body: JSON.stringify({ model, prompt, model_mode }),
    }
  );
  if (!res.ok) throw new Error(`Regeneration failed (HTTP ${res.status})`);
  return await res.json();
}

function regenerateAssetMock(
  id: number,
  assetId: number,
  model: string | null
): GeneratedAsset {
  const assets = mockAssets[id] || [];
  const index = assets.findIndex((a) => a.id === assetId);
  if (index === -1) throw new Error('Asset not found');
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

// Subscribe to progress stream via SSE, with polling fallback if SSE drops.
export function subscribeToEvents(
  id: number,
  onEvent: (event: { stage: string; status: string; model_used: string | null; error_message: string | null }) => void,
  onError: () => void,
  onComplete: () => void
): () => void {
  let eventSource: EventSource | null = null;
  let pollInterval: ReturnType<typeof setInterval> | null = null;
  let completed = false;

  const finish = (fn: () => void) => {
    if (completed) return;
    completed = true;
    if (pollInterval) clearInterval(pollInterval);
    fn();
  };

  // Polling fallback: if SSE drops, poll the project status until done/failed.
  const startPolling = () => {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      if (completed) { if (pollInterval) clearInterval(pollInterval); return; }
      try {
        const p = await getProject(id);
        if (p.status === 'done') {
          finish(onComplete);
        } else if (p.status === 'failed') {
          finish(onError);
        }
      } catch { /* keep polling */ }
    }, 3000);
  };

  isBackendOnline().then(online => {
    if (online) {
      const token = getStoredToken() || '';
      eventSource = new EventSource(`${BACKEND_URL}/projects/${id}/events?token=${encodeURIComponent(token)}`);
      eventSource.onmessage = (e) => {
        const data = JSON.parse(e.data);
        onEvent(data);
        if (data.stage === 'Running Critic Review' && data.status === 'completed') {
          eventSource?.close();
          finish(onComplete);
        }
        if (data.status === 'failed') {
          eventSource?.close();
          finish(onError);
        }
      };
      eventSource.onerror = () => {
        eventSource?.close();
        // Graceful degradation: fall back to polling instead of immediately erroring.
        startPolling();
      };
      // Always-on safety poll alongside SSE: catches completion even if the
      // SSE event was missed (connected after broadcast, silent drop, etc).
      startPolling();
    } else {
      // Mock SSE execution
      runMockPipelineFlow(id, onEvent, onComplete);
    }
  });

  return () => {
    if (eventSource) eventSource.close();
    if (pollInterval) clearInterval(pollInterval);
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
      quote: "The true bottleneck in modern content creation isn't writing original ideas—it's distribution. Taking one massive video or podcast and refracturing it into ten platform-native posts multiplies your audience footprint by 10x.",
      reason: "High-value core thesis of content repurposing."
    },
    {
      id: 2,
      project_id: projectId,
      start_seconds: 78,
      end_seconds: 122,
      quote: "Every social network has its own native culture and format constraints. If you just copy and paste descriptions between platforms, you are leaving 90% of your engagement on the table.",
      reason: "Explaining why custom platform templates are required."
    },
    {
      id: 3,
      project_id: projectId,
      start_seconds: 190,
      end_seconds: 240,
      quote: "Prism AI automates this workflow in under 90 seconds. It handles transcription, moment selection, writing, and runs an automated critic loop to remove generic AI filler statements.",
      reason: "Outlining the backend pipeline technology."
    }
  ];

  mockAssets[projectId] = [
    {
      id: 101,
      project_id: projectId,
      asset_type: 'blog',
      content: `# The Power of Content Refraction: How to Multiply Your Distribution
      
In the digital attention economy, content creation is only half the battle. The other half—often the more difficult half—is distribution.

Many creators spend 20 hours producing a single deep-dive video, publish it on one platform, and hope for the best. This is a massive waste of leverage. High-growth media brands succeed through **Content Refraction**: taking a single core piece of content and refracting it into platform-native text, micro-posts, and highlight clips.

## What is Content Refraction?
Content refraction is the systematic process of breaking down long-form media into smaller, highly-targeted assets. Instead of copy-pasting the same description, you write custom assets tailored to each channel's native culture.

> "The true bottleneck in modern content creation isn't writing original ideas—it's distribution. Taking one massive video or podcast and refracturing it into ten platform-native posts multiplies your audience footprint by 10x."

## How Prism AI Automates the Refraction Pipeline
Prism AI makes content distribution seamless through automated engineering steps:
1. **Source Transcription**: Ingests YouTube URLs, audio files, or raw text transcripts.
2. **Key Moments Extraction**: Locates high-leverage quotes and timestamps.
3. **Platform-Native Layouts**: Generates structured LinkedIn cards, X threads, and detailed SEO blogs.
4. **Critic Engine Review**: An automated review step audits tone and formatting to ensure it sounds human.

*Refracting content is not about spamming; it is about multiplying your leverage.*`,
      related_highlight_id: null,
      model_used: 'meta-llama/llama-3.3-70b-instruct:free',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 102,
      project_id: projectId,
      asset_type: 'thread',
      content: `1/ Creating content is hard. Distributing it is even harder. 

Most creators spend hours editing a video, post it once, and move on. This wastes 90% of its potential reach.

Here is how "content refraction" multiplies your output by 10x. 🧵

2/ Every social network has its own native culture. 

A copy-pasted YouTube description doesn't work on LinkedIn. A block of text doesn't work on X. 

You need platform-native assets: short threads for X, professional insights for LinkedIn, and SEO articles for Google.

3/ Prism AI automates this layout mapping. 

It takes a single video link, transcribes it, and writes:
- ✍️ High-retention X threads
- 💼 Authoritative LinkedIn updates
- 📖 Deep-dive SEO blog articles
- ✂️ Viral short clip recommendations

4/ The result? 10x distribution in less than 90 seconds, all derived directly from your original voice. Stop creating more. Refract what you already have.`,
      related_highlight_id: null,
      model_used: 'deepseek/deepseek-chat:free',
      status: 'done',
      created_at: new Date().toISOString()
    },
    {
      id: 103,
      project_id: projectId,
      asset_type: 'linkedin',
      content: `If you are only posting your videos on one platform, you are leaving 90% of your audience on the table. 

High-performing creators don't make more content. They refract what they already have.

Content refraction is the process of taking a single long-form asset (like a podcast or webinar) and spinning it out into platform-native, high-value formats:
- X Threads: To capture visual feed attention.
- LinkedIn Cards: To establish professional authority.
- Blog Articles: To capture long-term search engine value.

Prism AI automates this entire pipeline in under 90 seconds. It transcribes your media, extracts high-leverage key moments, and writes human-quality social copies tailored to each network. 

Stop playing the volume game. Master the leverage game.

#ContentMarketing #AI #ContentRepurposing #PrismAI #CreatorEconomy`,
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
- **Caption:** The leverage secret that high-growth creators use to multiply their reach.
- **On-Screen Text:** MULTIPLY YOUR DISTRIBUTION`,
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
- **Caption:** Why copying and pasting descriptions across social platforms fails.
- **On-Screen Text:** CUSTOMIZE FOR PLATFORM CULTURES`,
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
  if (type === "thumbnail") {
    // Return a proper image URL for thumbnails, not text (which would be
    // used as an img src and 404).
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop";
  }
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
    { name: 'Running Critic Review', duration: 3500 }
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

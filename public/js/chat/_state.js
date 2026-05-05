/* global BrandingService, ChartRenderer, RadarChart, XLSX, LLMHealth, authFetch */
/* chat _state — top-level mutable state and DOM element captures */
// State
let currentModel = 'claude-sonnet-4-6';
let conversationHistory = [];
let isStreaming = false;
let attachedFiles = [];
let currentConversationId = null;
let conversations = [];
let loadingMessageController = null; // Controller for rotating loading messages
let modelCapabilities = {}; // Store model capabilities for UI display
let imageGenerationEnabled = true; // Enable automatic image generation detection

// DOM Elements
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');
const sendBtn = document.getElementById('sendBtn');
const modelSelect = document.getElementById('modelSelect');
const modelIndicator = document.getElementById('modelIndicator');
const enableSearch = document.getElementById('enableSearch');
const enableVoice = document.getElementById('enableVoice');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const statusText = document.getElementById('statusText');

// Admin state
let isPlatformAdmin = false;
let showAllConversations = false;
let organizations = [];
let selectedOrgFilter = '';

// Org filter state
let userOrgId = null;
let conversationScope = 'mine'; // 'mine' | 'org' | 'all'

// Panel collapse state
let isPanelCollapsed = localStorage.getItem('chat-panel-collapsed') === 'true';

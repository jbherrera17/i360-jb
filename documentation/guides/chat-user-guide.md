# Higgins User Guide

**For:** Insight 360 Users
**Last Updated:** Tuesday, February 10, 2026

---

## Meet Higgins

Higgins is your AI guide to Insight 360. Named after the patient teacher from "My Fair Lady," Higgins is designed to be warm, knowledgeable, and helpful—whether you're asking about i360 features or need assistance with any other task.

**What makes Higgins special:**
- **i360 Expertise**: Higgins knows the system inside and out and can guide you through features
- **Model flexibility**: Switch between Claude, GPT, Gemini, and Perplexity models mid-conversation
- **Real-time information**: Enable web search for current data
- **Voice output**: Hear responses read aloud with multiple voice options
- **File analysis**: Upload documents, images, and PDFs for AI review
- **Image generation**: Request AI-generated images directly in chat
- **Consistent voice**: Higgins responds with a warm, values-driven personality regardless of which model you select

---

## What Higgins Can Do

| Feature | Description |
|---------|-------------|
| **i360 Help** | Ask how to use any feature, module, or workflow |
| **Multi-Model Chat** | Choose from Claude, GPT, Gemini, and Perplexity families |
| **Web Search** | Query the internet for real-time information |
| **Voice Output** | Hear AI responses read aloud |
| **File Upload** | Analyze images, PDFs, code files, and documents |
| **Image Generation** | Generate images from text descriptions |
| **Conversations** | Save, organize, and revisit past chats |
| **Streaming** | See responses as they're generated in real-time |
| **Smart Scrolling** | Messages stay visible as content grows |

---

## Chat Interface Features

### Real-Time Token Streaming

Higgins streams responses token-by-token so you can read as the AI writes. This provides:
- **Immediate feedback**: See the first words within seconds
- **Natural reading flow**: Content appears at a comfortable pace
- **Early cancellation**: Stop if the response isn't what you need

### Smart Scroll Behavior

The chat interface intelligently manages scrolling:
- **User message at top**: When you send a message, it scrolls to show your message at the top of the viewport
- **Auto-follow tokens**: As Higgins responds, new content stays visible
- **Scroll-to-bottom button**: If you scroll up to read earlier content, a down-arrow button appears to jump back to the latest response
- **Respect user scroll**: If you scroll up during streaming, auto-scroll pauses so you can read

### Links Open in New Tabs

All links in Higgins responses (including those in tables and markdown) automatically open in a new browser tab, keeping your chat session intact.

---

## Step by Step Use

### Starting a Chat with Higgins

1. Click **Higgins** in the sidebar (or use Dashboard Quick Action)
2. You'll see the welcome message with quick action buttons
3. Type your message in the input box at the bottom
4. Press **Enter** or click the send button

### Getting i360 Help

Ask Higgins anything about Insight 360:
- "How do I create a context asset?"
- "What are the three pillars of i360?"
- "Where can I find the Agent Library?"
- "How do I map context to an agent?"

Higgins will provide clear, step-by-step guidance. Higgins automatically has access to i360 feature documentation and knowledge assets, so answers are informed by the actual platform capabilities.

### Choosing a Model

1. Click the **Model Selector** dropdown (top of chat)
2. Browse available models by provider:
   - **Claude**: Opus 4.6 (most capable, 1M context), Opus 4.5, Sonnet 4.5 (balanced), Haiku 4.5 (fast)
   - **OpenAI**: GPT-5.2, GPT-5.2 Instant, GPT-5.2 Codex, GPT-4o, o1 (reasoning), o1-mini
   - **Perplexity**: Sonar Pro, Sonar, Sonar Reasoning Pro, Deep Research
   - **Gemini**: Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Pro, Gemini 2.5 Flash
3. Click to select
4. Your next message will use the selected model
5. You can switch models anytime—the conversation continues seamlessly

**Note:** Higgins maintains the same helpful personality regardless of which model you choose.

### Using Web Search

1. Toggle the **Search** button (magnifying glass icon) to ON
2. The button turns blue when active
3. Ask questions requiring current information:
   - "What are today's top tech news stories?"
   - "What's the current weather in New York?"
   - "Find recent articles about AI regulation"
4. The AI will search the web and include sources in its response

**Note:** Perplexity models have built-in search included with every response, so they always return citations and current information without needing to toggle the search button.

### Using Voice Output

**Enabling Voice:**
1. Toggle the **Voice** button (microphone icon) to ON
2. When voice is enabled, responses are read aloud

**Choosing a Voice:**
1. Select a voice profile from the voice dropdown:
   - Nova, Alloy, Echo, Fable, Onyx, Shimmer
2. Click the speaker icon on any message to replay

### Generating Images

Higgins can generate images on request:
1. Ask for an image: "Create a landscape image of a mountain sunset" or "Generate an illustration of a coffee shop"
2. Specify size preference: 16:9 (landscape), 9:16 (portrait), or 1:1 (square)
3. Higgins uses GPT Image 1.5 to generate the image
4. The response shows both your original prompt and the AI-revised prompt used for generation
5. You can copy the revised prompt to modify and regenerate

### Uploading Files

1. Click the **Attach** button (paperclip icon)
2. Select a file from your computer:
   - **Images**: PNG, JPG, GIF, WebP
   - **Documents**: PDF, TXT, MD
   - **Data**: CSV, JSON
   - **Code**: Various programming language files
3. The file appears as a preview
4. Type your question about the file
5. Send—Higgins analyzes the content

**Example prompts for files:**
- "Summarize this document"
- "What does this image show?"
- "Find errors in this code"
- "Extract key data from this PDF"

### Managing Conversations

**Creating a New Conversation:**
1. Click the **New Chat** button (+ icon) in the conversation panel
2. Enter a title (optional—it auto-generates from your first message)
3. Start chatting

**Switching Conversations:**
1. Open the conversation panel (right side)
2. Click any conversation to load it
3. Your chat history appears instantly

**Deleting a Conversation:**
1. Hover over a conversation in the list
2. Click the trash icon
3. Confirm deletion

**Resizing the Panel:**
1. Drag the divider between chat and conversation list
2. Your preference is saved automatically

### Admin Conversation Management (Platform Admins Only)

Platform admins have additional conversation capabilities:
1. Toggle "View All Conversations" to see conversations across organizations
2. Use the organization filter dropdown to narrow by specific organization
3. View conversation statistics and usage patterns
4. Access any conversation for support and oversight purposes

---

## Tips for Best Results

### Choose the Right Model

| Task | Recommended Model |
|------|-------------------|
| Complex reasoning, strategy | Claude Opus 4.6 |
| General conversation, writing | Claude Sonnet 4.5 (default) |
| Quick questions, brainstorming | Claude Haiku 4.5 |
| Code generation | Claude Sonnet 4.5 or GPT-5.2 Codex |
| Research with citations | Perplexity Sonar Pro or Deep Research |
| Advanced reasoning | o1 or Sonar Reasoning Pro |
| Fast responses | Gemini 3 Flash or GPT-5.2 Instant |

### Asking Higgins for Help

- Be specific: "How do I map a context asset to an agent?" vs. "Help me with context"
- Ask follow-up questions if you need more detail
- Higgins can explain concepts, guide you through workflows, or help troubleshoot

### Web Search Tips
- Be specific: "Latest iPhone 16 reviews" vs. "iPhone news"
- Include timeframes: "AI news from this week"
- Search is best for facts, not opinions
- Use Perplexity models for always-on search with automatic citations

### Voice Tips
- Choose a voice that matches your preference from the 6 available options
- Click the speaker icon on any message to replay it
- Voice output works best for shorter, conversational responses

### File Analysis Tips
- Use high-resolution images for better analysis
- PDFs with text (not scanned images) work best
- Large files may take longer to process

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift+Enter` | New line in message |
| `Escape` | Close modals |

---

## Related Documentation

| Document | Description | Location |
|----------|-------------|----------|
| Agents User Guide | Run specialized agents | [agents-user-guide.md](./agents-user-guide.md) |
| Context Assets Guide | Add business context to chats | [context-user-guide.md](./context-user-guide.md) |
| Dashboard Guide | Quick actions overview | [dashboard-user-guide.md](./dashboard-user-guide.md) |

---

## Troubleshooting

**Messages not sending:**
- Check your internet connection
- Verify the selected model is available (Dashboard → System Status)
- Try refreshing the page

**Voice not working:**
- Voice output requires the Voice service to be online (check System Status)
- Check browser compatibility (Chrome recommended)
- Try selecting a different voice profile

**File upload fails:**
- Check file size (max varies by type)
- Ensure file format is supported
- Try a different browser if issues persist

**Web search returns no results:**
- Check that Search service is online
- Try rephrasing your query
- Consider using a Perplexity model for built-in search capabilities

**Image generation not working:**
- Image generation requires an OpenAI API key
- Ensure the GPT Image model is available
- Try simplifying your image description

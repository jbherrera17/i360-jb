# Higgins User Guide

**For:** Insight 360 Users
**Last Updated:** January 13, 2026

---

## Meet Higgins

Higgins is your AI guide to Insight 360. Named after the patient teacher from "My Fair Lady," Higgins is designed to be warm, knowledgeable, and helpful—whether you're asking about i360 features or need assistance with any other task.

**What makes Higgins special:**
- **i360 Expertise**: Higgins knows the system inside and out and can guide you through features
- **Model flexibility**: Switch between Claude, GPT, and Perplexity models mid-conversation
- **Real-time information**: Enable web search for current data
- **Voice interaction**: Speak naturally and hear responses
- **File analysis**: Upload documents, images, and PDFs for AI review
- **Consistent voice**: Higgins responds with a warm, values-driven personality regardless of which model you select

---

## What Higgins Can Do

| Feature | Description |
|---------|-------------|
| **i360 Help** | Ask how to use any feature, module, or workflow |
| **Multi-Model Chat** | Choose from Claude (Opus, Sonnet, Haiku), GPT, and Perplexity |
| **Web Search** | Query the internet for real-time information |
| **Voice I/O** | Speak messages and hear AI responses |
| **File Upload** | Analyze images, PDFs, and documents |
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

Higgins will provide clear, step-by-step guidance.

### Choosing a Model

1. Click the **Model Selector** dropdown (top of chat)
2. Browse available models:
   - **Claude Models**: Opus 4.5 (most capable), Sonnet 4.5 (balanced), Haiku 4.5 (fast)
   - **GPT Models**: GPT-4o, GPT-5.2, o1 (reasoning)
   - **Perplexity**: Sonar Pro (with built-in web search)
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

### Using Voice Input/Output

**Enabling Voice:**
1. Toggle the **Voice** button (microphone icon) to ON
2. Grant microphone permission if prompted

**Speaking a Message:**
1. Click the microphone button in the input area
2. Speak your message clearly
3. Click again to stop recording
4. Your speech is transcribed and sent

**Hearing Responses:**
1. When voice is enabled, responses are read aloud
2. Choose a voice profile from settings:
   - Nova, Alloy, Echo, Fable, Onyx, Shimmer
3. Click the speaker icon on any message to replay

### Uploading Files

1. Click the **Attach** button (paperclip icon)
2. Select a file from your computer:
   - **Images**: PNG, JPG, GIF, WebP
   - **Documents**: PDF, TXT, MD
   - **Data**: CSV, JSON
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

---

## Tips for Best Results

### Choose the Right Model

| Task | Recommended Model |
|------|-------------------|
| Complex reasoning, strategy | Claude Opus 4.5 |
| General conversation, writing | Claude Sonnet 4.5 (default) |
| Quick questions, brainstorming | Claude Haiku 4.5 |
| Code generation | Claude Sonnet 4.5 or GPT-4o |
| Research with citations | Perplexity Sonar Pro |

### Asking Higgins for Help

- Be specific: "How do I map a context asset to an agent?" vs. "Help me with context"
- Ask follow-up questions if you need more detail
- Higgins can explain concepts, guide you through workflows, or help troubleshoot

### Web Search Tips
- Be specific: "Latest iPhone 16 reviews" vs. "iPhone news"
- Include timeframes: "AI news from this week"
- Search is best for facts, not opinions

### Voice Tips
- Speak clearly in a quiet environment
- Pause briefly before and after speaking
- Voice works best for conversational queries

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
- Ensure microphone permissions are granted
- Check browser compatibility (Chrome recommended)
- Verify Voice service is online in System Status

**File upload fails:**
- Check file size (max varies by type)
- Ensure file format is supported
- Try a different browser if issues persist

**Web search returns no results:**
- Check that Search service is online
- Try rephrasing your query
- Some queries may be blocked by content filters

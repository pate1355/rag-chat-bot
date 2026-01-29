# 🤖 RAG Chatbot with Google Gemini

A premium, full-stack **Retrieval-Augmented Generation (RAG)** chatbot built with React, Node.js, and Google's Gemini AI. This application allows users to upload multiple documents (PDF, DOCX, TXT) and have natural conversations about their content, with support for specific file referencing and streaming responses.

![Project Preview](https://via.placeholder.com/800x450.png?text=RAG+Chatbot+Preview)
*(Replace this with an actual screenshot of your UI)*

## ✨ Key Features

- **🧠 Advanced RAG Engine**: Uses keyword-based retrieval with balanced chunk selection to handle multi-document context effectively.
- **⚡ Google Gemini Integration**: Powered by `gemini-2.0-flash` for fast, accurate, and context-aware responses.
- **💬 Real-time Streaming**: Chat responses stream in real-time using Server-Sent Events (SSE).
- **📄 Multi-Document Support**: Upload up to **5 documents** simultaneously.
- **🎯 Precise Querying**: Use **`@filename`** mentions in chat (e.g., `"@resume what are the skills?"`) to filter answers to specific documents.
- **🎨 Premium UI/UX**:
  - Modern **Glassmorphism** design
  - Fluid animations & transitions
  - Markdown rendering for rich text responses
  - Drag-and-drop file upload
- **🔄 Smart Comparison**: Ask questions like *"Compare @doc1 and @doc2"* to get balanced insights from both sources.

## 🛠️ Tech Stack

### Frontend
- **React 18** (Vite)
- **TailwindCSS** (Styling & Animations)
- **Lucide React** (Icons)
- **React Markdown** (Rich Text Rendering)

### Backend
- **Node.js & Express**
- **Google Generative AI SDK**
- **Multer** (File Handling)
- **PDF Parse / Mammoth** (Text Extraction)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- A [Google Gemini API Key](https://aistudio.google.com/apikey)

### 1. Clone the Repository
```bash
git clone https://github.com/pate1355/rag-chat-bot.git
cd rag-chat-bot
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API Key:
```env
PORT=3001
GEMINI_API_KEY=your_api_key_here
```

Start the backend server:
```bash
npm run dev
# Server runs on http://localhost:3001
```

### 3. Frontend Setup
Open a new terminal, navigate to the frontend folder, and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
# App runs on http://localhost:3000
```

## 📖 Usage Guide

1.  **Upload Documents**: Drag & drop PDF, DOCX, or TXT files into the upload zone. You can upload up to 5 files.
2.  **Ask Questions**: Go to the "Chat" tab and ask anything about your documents.
3.  **Target Specific Files**: Type `@` in the chat box to see a dropdown of your files. Select one to focus the AI's answer on that document.
    - Example: _"@contract what is the termination clause?"_
4.  **Compare Documents**: Mention multiple files to force the AI to look at both.
    - Example: _"Compare the revenue figures in @2023_Report and @2024_Report"_

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

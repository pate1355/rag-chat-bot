import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pdf from "pdf-parse";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// In-memory storage for documents and embeddings
const documentStore = {
  documents: [], // { id, fileName, chunks: string[] }
  chatHistory: new Map(), // sessionId -> messages[]
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOCX, and TXT files are allowed."));
    }
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Extract text from uploaded file
async function extractText(file) {
  const mimeType = file.mimetype;

  if (mimeType === "application/pdf") {
    const data = await pdf(file.buffer);
    return data.text;
  } else if (mimeType === "text/plain") {
    return file.buffer.toString("utf-8");
  } else if (
    mimeType === "application/msword" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // For DOCX, we'll just extract basic text
    // In production, you'd want to use a library like mammoth
    return file.buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type");
}

// Helper: Split text into chunks
function splitIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start + overlap >= text.length) break;
  }

  return chunks;
}

// Helper: Parse @mentions from query to get referenced file names
function parseFileMentions(query) {
  const mentionRegex = /@([^\s@]+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(query)) !== null) {
    mentions.push(match[1].toLowerCase());
  }
  
  // Clean query by removing @mentions
  const cleanQuery = query.replace(/@[^\s@]+/g, '').trim();
  
  console.log(`🏷️ Parsed mentions: ${mentions.length > 0 ? mentions.join(', ') : 'none'}`);
  
  return { mentions, cleanQuery };
}

// Helper: Check if a document matches any of the target mentions
function docMatchesMentions(docFileName, targetMentions) {
  const docNameLower = docFileName.toLowerCase();
  const docBaseName = docNameLower.replace(/\.[^.]+$/, ''); // Remove extension
  
  return targetMentions.some(target => {
    // Match if doc name contains the mention OR mention contains the doc base name
    const targetClean = target.replace(/[_-]/g, ''); // Handle underscores/dashes
    const docClean = docBaseName.replace(/[_-]/g, '');
    
    return docNameLower.includes(target) || 
           target.includes(docBaseName) ||
           docClean.includes(targetClean) ||
           targetClean.includes(docClean);
  });
}

// Helper: Retrieve relevant chunks - supports @filename filtering for multiple docs
function retrieveRelevantChunks(query, topK = 5, targetFileNames = []) {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const chunksPerDoc = new Map(); // Group chunks by document

  console.log(`📝 Query: "${query}"`);
  console.log(`📚 Documents in store: ${documentStore.documents.length}`);
  
  if (targetFileNames.length > 0) {
    console.log(`🎯 Filtering by files: ${targetFileNames.join(', ')}`);
  }

  for (const doc of documentStore.documents) {
    // If specific files are targeted, only include matching documents
    if (targetFileNames.length > 0) {
      if (!docMatchesMentions(doc.fileName, targetFileNames)) {
        continue;
      }
      console.log(`   ✓ Matched: ${doc.fileName}`);
    }

    console.log(`   - ${doc.fileName}: ${doc.chunks.length} chunks`);
    
    const docChunks = [];
    for (let i = 0; i < doc.chunks.length; i++) {
      const chunk = doc.chunks[i];
      const chunkLower = chunk.toLowerCase();
      let score = 0;

      // Score based on keyword matches
      for (const word of queryWords) {
        if (chunkLower.includes(word)) {
          score += 1;
        }
      }

      docChunks.push({ 
        chunk, 
        score, 
        fileName: doc.fileName,
        index: i 
      });
    }
    
    chunksPerDoc.set(doc.fileName, docChunks);
  }

  // If multiple documents are targeted, get balanced chunks from each
  let result = [];
  
  if (targetFileNames.length > 1 && chunksPerDoc.size > 1) {
    // Distribute chunks evenly across referenced documents
    const chunksPerDocument = Math.max(3, Math.ceil(topK / chunksPerDoc.size));
    
    for (const [fileName, chunks] of chunksPerDoc) {
      chunks.sort((a, b) => b.score - a.score);
      result.push(...chunks.slice(0, chunksPerDocument));
    }
    
    // Sort all by score and limit
    result.sort((a, b) => b.score - a.score);
    
    console.log(`📊 Multi-doc mode: ${chunksPerDocument} chunks per doc, ${result.length} total`);
  } else {
    // Single doc or no filter: standard behavior
    const allChunks = [];
    for (const chunks of chunksPerDoc.values()) {
      allChunks.push(...chunks);
    }
    allChunks.sort((a, b) => b.score - a.score);
    result = allChunks.slice(0, topK);
  }
  
  console.log(`🔍 Returning ${result.length} chunks from ${new Set(result.map(c => c.fileName)).size} doc(s)`);
  
  return result;
}

// API endpoint to get list of uploaded documents (for @mentions autocomplete)


// API Routes

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", documentsCount: documentStore.documents.length });
});

// Get list of uploaded documents (for @mentions)
app.get("/api/documents", (req, res) => {
  const docs = documentStore.documents.map(doc => ({
    id: doc.id,
    fileName: doc.fileName,
    chunksCount: doc.chunks.length
  }));
  res.json({ documents: docs, maxDocuments: 5 });
});

// Delete a document
app.delete("/api/documents/:id", (req, res) => {
  const { id } = req.params;
  const index = documentStore.documents.findIndex(doc => doc.id === id);
  
  if (index === -1) {
    return res.status(404).json({ success: false, error: "Document not found" });
  }
  
  const deleted = documentStore.documents.splice(index, 1)[0];
  console.log(`🗑️ Deleted document: ${deleted.fileName}`);
  
  res.json({ success: true, fileName: deleted.fileName });
});
app.post("/api/upload", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    // Check document limit
    if (documentStore.documents.length >= 5) {
      return res.status(400).json({ 
        success: false, 
        error: "Maximum 5 documents allowed. Please delete a document first." 
      });
    }

    const text = await extractText(req.file);
    const chunks = splitIntoChunks(text);

    const docId = Date.now().toString();
    documentStore.documents.push({
      id: docId,
      fileName: req.file.originalname,
      chunks,
    });

    res.json({
      success: true,
      fileName: req.file.originalname,
      totalChunks: chunks.length,
      documentId: docId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload multiple documents
app.post("/api/upload/multiple", upload.array("documents", 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: "No files uploaded" });
    }

    const results = [];

    for (const file of req.files) {
      try {
        const text = await extractText(file);
        const chunks = splitIntoChunks(text);

        const docId = Date.now().toString();
        documentStore.documents.push({
          id: docId,
          fileName: file.originalname,
          chunks,
        });

        results.push({
          success: true,
          fileName: file.originalname,
          totalChunks: chunks.length,
          documentId: docId,
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: file.originalname,
          error: error.message,
        });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Chat endpoint (non-streaming)
app.post("/api/chat", async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (documentStore.documents.length === 0) {
      return res.status(400).json({ error: "No documents uploaded. Please upload documents first." });
    }

    // Parse @mentions from query
    const { mentions, cleanQuery } = parseFileMentions(query);

    // Retrieve relevant chunks (filtered by @mentions if present)
    const relevantChunks = retrieveRelevantChunks(cleanQuery || query, 5, mentions);

    // Build context from retrieved chunks
    const context = relevantChunks
      .map((c) => `[From ${c.fileName}]: ${c.chunk}`)
      .join("\n\n");

    // Build prompt with file context
    const fileContext = mentions.length > 0 
      ? `The user is specifically asking about: ${mentions.join(', ')}.`
      : '';

    const prompt = `You are a helpful assistant that answers questions based on the provided document context.
${fileContext}

Context from uploaded documents:
${context}

User question: ${cleanQuery || query}

Please provide a helpful, accurate answer based on the context above. If the context doesn't contain relevant information, say so clearly.`;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Store in chat history
    if (sessionId) {
      if (!documentStore.chatHistory.has(sessionId)) {
        documentStore.chatHistory.set(sessionId, []);
      }
      documentStore.chatHistory.get(sessionId).push(
        { role: "user", content: query },
        { role: "assistant", content: response }
      );
    }

    res.json({
      answer: response,
      sources: relevantChunks.map((c) => c.fileName),
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Chat streaming endpoint
app.post("/api/chat/stream", async (req, res) => {
  try {
    const { query, sessionId } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (documentStore.documents.length === 0) {
      return res.status(400).json({ error: "No documents uploaded. Please upload documents first." });
    }

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Parse @mentions from query
    const { mentions, cleanQuery } = parseFileMentions(query);
    
    // Retrieve relevant chunks (filtered by @mentions if present)
    const relevantChunks = retrieveRelevantChunks(cleanQuery || query, 5, mentions);

    // Build context from retrieved chunks
    const context = relevantChunks
      .map((c) => `[From ${c.fileName}]: ${c.chunk}`)
      .join("\n\n");

    // Build prompt with file context
    const fileContext = mentions.length > 0 
      ? `The user is specifically asking about: ${mentions.join(', ')}.`
      : '';
    
    const prompt = `You are a helpful assistant that answers questions based on the provided document context.
${fileContext}

Context from uploaded documents:
${context}

User question: ${cleanQuery || query}

Please provide a helpful, accurate answer based on the context above. If the context doesn't contain relevant information, say so clearly.`;

    // Generate streaming response
    const result = await model.generateContentStream(prompt);

    let fullResponse = "";

    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
    }

    // Store in chat history
    if (sessionId) {
      if (!documentStore.chatHistory.has(sessionId)) {
        documentStore.chatHistory.set(sessionId, []);
      }
      documentStore.chatHistory.get(sessionId).push(
        { role: "user", content: query },
        { role: "assistant", content: fullResponse }
      );
    }

    res.write(`data: ${JSON.stringify({ done: true, sources: relevantChunks.map((c) => c.fileName) })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Get chat history
app.get("/api/chat/history/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const history = documentStore.chatHistory.get(sessionId) || [];
  res.json({ history });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RAG Chatbot backend running on http://localhost:${PORT}`);
  console.log(`📚 Document store ready`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  Warning: GEMINI_API_KEY not set. Chat functionality will not work.");
    console.warn("   Get your API key from: https://aistudio.google.com/apikey");
  }
});

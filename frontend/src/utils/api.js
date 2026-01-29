import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Document upload functions
export const uploadDocument = async (file) => {
  const formData = new FormData();
  formData.append("document", file);

  const response = await api.post("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const uploadMultipleDocuments = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("documents", file);
  });

  const response = await api.post("/upload/multiple", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// Chat functions
export const sendMessage = async (message, sessionId) => {
  const response = await api.post("/chat", {
    query: message,
    sessionId: sessionId,
  });

  return response.data;
};

export const streamMessage = async (message, sessionId, onChunk) => {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: message,
      sessionId: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to stream message");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6);
        if (data.trim()) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              onChunk(parsed.chunk);
            }
            if (parsed.done) {
              return;
            }
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e);
          }
        }
      }
    }
  }
};

export const getChatHistory = async (sessionId) => {
  const response = await api.get(`/chat/history/${sessionId}`);
  return response.data;
};

// Get list of uploaded documents
export const getDocuments = async () => {
  const response = await api.get("/documents");
  return response.data;
};

// Delete a document
export const deleteDocument = async (docId) => {
  const response = await api.delete(`/documents/${docId}`);
  return response.data;
};

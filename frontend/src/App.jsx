import React, { useState } from 'react';
import DocumentUpload from './components/DocumentUpload';
import ChatInterface from './components/ChatInterface';
import { MessageCircle, Upload, Zap, FileText } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploadedDocs, setUploadedDocs] = useState([]);

  const handleDocumentUploaded = (doc) => {
    setUploadedDocs(prev => [...prev, doc]);
  };

  const handleDocumentDeleted = (docId) => {
    setUploadedDocs(prev => prev.filter(doc => doc.documentId !== docId));
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            RAG Chatbot
          </h1>
          <p className="text-gray-500 text-lg">
            Upload documents and ask questions powered by AI
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card rounded-3xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200/50">
            <button
              className={`tab-button flex-1 py-5 px-6 font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 ${activeTab === 'upload' ? 'active' : ''
                }`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload className="w-5 h-5" />
              Upload Documents
              {uploadedDocs.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                  {uploadedDocs.length}/5
                </span>
              )}
            </button>
            <button
              className={`tab-button flex-1 py-5 px-6 font-semibold text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'active' : ''
                }`}
              onClick={() => setActiveTab('chat')}
            >
              <MessageCircle className="w-5 h-5" />
              Chat
              {uploadedDocs.length > 0 && (
                <span className="ml-2 px-2.5 py-0.5 text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full">
                  Ready
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'upload' && (
              <DocumentUpload
                onDocumentUploaded={handleDocumentUploaded}
                uploadedDocs={uploadedDocs}
                onDocumentDeleted={handleDocumentDeleted}
              />
            )}
            {activeTab === 'chat' && (
              <ChatInterface uploadedDocs={uploadedDocs} />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400 text-sm">
          Powered by Google Gemini AI • Use @filename to reference specific documents
        </div>
      </div>
    </div>
  );
}

export default App;
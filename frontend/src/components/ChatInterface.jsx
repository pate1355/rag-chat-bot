import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, FileText, Zap, AtSign } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { streamMessage } from '../utils/api';
import { useChat } from '../hooks/useChat';

const ChatInterface = ({ uploadedDocs }) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const { messages, addMessage, sessionId } = useChat();

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Filter documents for @mentions
  const filteredDocs = uploadedDocs.filter(doc =>
    doc.fileName.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Check for @ mention trigger
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentions(false);
      setMentionFilter('');
    }
  };

  const insertMention = (fileName) => {
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = message.slice(0, cursorPos);
    const textAfterCursor = message.slice(cursorPos);

    // Find the @ symbol position
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (atMatch) {
      const beforeAt = textBeforeCursor.slice(0, atMatch.index);
      // Remove extension for cleaner mention
      const cleanName = fileName.replace(/\.[^.]+$/, '');
      const newMessage = `${beforeAt}@${cleanName} ${textAfterCursor}`;
      setMessage(newMessage);
    }

    setShowMentions(false);
    setMentionFilter('');
    textareaRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredDocs.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev + 1) % filteredDocs.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev - 1 + filteredDocs.length) % filteredDocs.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredDocs[mentionIndex].fileName);
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (uploadedDocs.length === 0) {
      alert('Please upload at least one document before chatting.');
      return;
    }

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    });

    try {
      // Create assistant message for streaming
      const assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        sources: []
      };

      addMessage(assistantMessage);

      // Stream the response
      await streamMessage(userMessage, sessionId, (chunk) => {
        assistantMessage.content += chunk;
        // Force re-render by updating the message
        addMessage({ ...assistantMessage }, true);
      });
    } catch (error) {
      console.error('Chat error:', error);
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (uploadedDocs.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-6">
          <FileText className="w-10 h-10 text-indigo-500" />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-3">
          No Documents Available
        </h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Upload some documents first to start chatting. I'll help you find answers from your uploaded files.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px]">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50 rounded-2xl">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Ready to help!
            </h3>
            <p className="text-gray-500 mb-2">
              Ask me anything about your uploaded documents.
            </p>
            <p className="text-sm text-indigo-600 flex items-center justify-center gap-1">
              <AtSign className="w-4 h-4" />
              Use @filename to reference specific documents
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {['Summarize this document', 'What are the key points?', 'Explain the main topic'].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setMessage(suggestion)}
                  className="px-4 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageBubble key={index} message={msg} />
          ))
        )}
        {isLoading && (
          <div className="flex items-center gap-3 text-gray-500 pl-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 px-4 py-3 bg-white rounded-2xl shadow-sm">
              <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full"></span>
              <span className="typing-dot w-2 h-2 bg-indigo-400 rounded-full"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="mt-4 relative">
        {/* @Mentions Dropdown */}
        {showMentions && filteredDocs.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-10">
            <div className="p-2 border-b border-gray-100 text-xs text-gray-500 flex items-center gap-1">
              <AtSign className="w-3 h-3" />
              Reference a document
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredDocs.map((doc, index) => (
                <button
                  key={doc.fileName}
                  type="button"
                  onClick={() => insertMention(doc.fileName)}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 text-sm transition-colors ${index === mentionIndex ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                >
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span className="truncate">{doc.fileName}</span>
                  <span className="text-xs text-gray-400 ml-auto">{doc.totalChunks} chunks</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question... Use @filename to reference specific docs"
              className="message-input w-full p-4 pr-4 bg-white border-2 border-gray-200 rounded-2xl focus:border-indigo-400 focus:ring-0 resize-none text-gray-800 placeholder-gray-400"
              rows="2"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="btn-primary p-4 rounded-2xl flex items-center justify-center disabled:opacity-40"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
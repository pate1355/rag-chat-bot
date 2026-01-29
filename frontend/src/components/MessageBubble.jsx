import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, AlertCircle } from 'lucide-react';

const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.error;

  return (
    <div className={`chat-bubble flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isUser
          ? 'bg-gradient-to-br from-gray-700 to-gray-900'
          : isError
            ? 'bg-gradient-to-br from-red-400 to-red-600'
            : 'bg-gradient-to-br from-indigo-500 to-purple-600'
        }`}>
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : isError ? (
          <AlertCircle className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div className={`inline-block px-5 py-3 rounded-2xl ${isUser
            ? 'bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-tr-md'
            : isError
              ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-md'
              : 'bg-white shadow-sm border border-gray-100 text-gray-800 rounded-tl-md'
          }`}>
          {message.content ? (
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-inherit">
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <span className="text-gray-400 italic text-sm">Generating response...</span>
          )}
        </div>

        {/* Timestamp */}
        <div className={`mt-1.5 text-xs text-gray-400 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
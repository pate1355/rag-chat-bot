import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [sessionId] = useState(() => uuidv4());

  const addMessage = useCallback((message, isUpdate = false) => {
    if (isUpdate) {
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = message;
        return newMessages;
      });
    } else {
      setMessages((prev) => [...prev, message]);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    addMessage,
    clearMessages,
    sessionId,
  };
};

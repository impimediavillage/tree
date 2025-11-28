'use client';

import { useState, useRef, useEffect } from 'react';
import { AIAdvisor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  creditsUsed?: number;
  tokensUsed?: number;
}

interface AdvisorChatInterfaceProps {
  advisor: AIAdvisor;
}

export default function AdvisorChatInterface({ advisor }: AdvisorChatInterfaceProps) {
  const { currentUser, setCurrentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<number>(advisor.creditCostBase);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Estimate cost based on message length (rough approximation)
  useEffect(() => {
    const estimatedTokens = Math.ceil(inputMessage.length / 4); // Rough estimate: 1 token ≈ 4 chars
    const tokenCost = Math.ceil(estimatedTokens * advisor.creditCostPerTokens);
    setEstimatedCost(advisor.creditCostBase + tokenCost);
  }, [inputMessage, advisor.creditCostBase, advisor.creditCostPerTokens]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentUser) return;

    // Check credits
    if ((currentUser.credits || 0) < estimatedCost) {
      toast({
        title: 'Insufficient Credits',
        description: `You need at least ${estimatedCost} credits. Please purchase more credits.`,
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const functions = getFunctions();
      const chatWithAdvisor = httpsCallable(functions, 'chatWithAdvisor');

      // Prepare conversation history
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await chatWithAdvisor({
        advisorSlug: advisor.slug,
        userMessage: userMessage.content,
        conversationHistory,
      });

      const data = response.data as {
        success: boolean;
        message: string;
        tokensUsed: number;
        creditsDeducted: number;
        model: string;
      };

      if (data.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          creditsUsed: data.creditsDeducted,
          tokensUsed: data.tokensUsed,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // Update user credits in context
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const updatedUserData = userSnap.data();
          setCurrentUser({
            ...currentUser,
            credits: updatedUserData.credits || 0,
          });
        }

        toast({
          title: 'Message Sent',
          description: `Used ${data.creditsDeducted} credits (${data.tokensUsed} tokens)`,
        });
      } else {
        throw new Error('Failed to get response from advisor');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error.code === 'unauthenticated') {
        errorMessage = 'Please sign in to continue.';
      } else if (error.code === 'failed-precondition') {
        errorMessage = error.message || 'Insufficient credits.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Remove the user message if request failed
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    toast({
      title: 'Conversation Cleared',
      description: 'Your chat history has been reset.',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md flex flex-col h-[600px]">
      {/* Chat Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Chat with {advisor.name}</h2>
          <p className="text-sm text-gray-500">
            {currentUser ? `${currentUser.credits || 0} credits available` : 'Sign in to chat'}
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearConversation}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div className="space-y-2">
              <p className="text-gray-500">Start a conversation with {advisor.name}</p>
              <p className="text-sm text-gray-400">Ask questions, get advice, and learn!</p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-[#006B3E] text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
                  <span>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.creditsUsed && (
                    <span className="ml-2">• {msg.creditsUsed} credits</span>
                  )}
                  {msg.tokensUsed && (
                    <span>• {msg.tokensUsed} tokens</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#006B3E]" />
              <span className="text-gray-600">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        {currentUser && (currentUser.credits || 0) < estimatedCost && (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium">Low Credits</p>
              <p className="text-amber-700">
                You need at least {estimatedCost} credits to send this message. Please purchase more credits.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={isLoading || !currentUser}
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim() || !currentUser || (currentUser.credits || 0) < estimatedCost}
            className="bg-[#006B3E] hover:bg-[#005030] px-4"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span className="font-medium text-[#006B3E]">
            Estimated: ~{estimatedCost} credits
          </span>
        </div>
      </div>
    </div>
  );
}

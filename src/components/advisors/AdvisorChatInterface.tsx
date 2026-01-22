'use client';

import { useState, useRef, useEffect } from 'react';
import { AIAdvisor } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle, RefreshCw, MapPin, ImagePlus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  creditsUsed?: number;
  tokensUsed?: number;
  imageUrl?: string;
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Estimate cost based on message length (rough approximation)
  useEffect(() => {
    const estimatedTokens = Math.ceil(inputMessage.length / 4); // Rough estimate: 1 token ≈ 4 chars
    const tokenCost = Math.ceil(estimatedTokens * advisor.creditCostPerTokens);
    const imageCost = selectedImage ? 10 : 0; // Add 10 credits for image processing
    setEstimatedCost(advisor.creditCostBase + tokenCost + imageCost);
  }, [inputMessage, advisor.creditCostBase, advisor.creditCostPerTokens, selectedImage]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (JPG, PNG, WEBP)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please select an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImageToStorage = async (file: File): Promise<string> => {
    const storage = getStorage();
    const timestamp = Date.now();
    const filename = `advisor-chats/${currentUser?.uid}/${timestamp}-${file.name}`;
    const imageRef = storageRef(storage, filename);
    
    await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(imageRef);
    return downloadURL;
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !selectedImage) || isLoading || !currentUser) return;

    // Check credits
    if ((currentUser.credits || 0) < estimatedCost) {
      toast({
        title: 'Insufficient Credits',
        description: `You need at least ${estimatedCost} credits. Please purchase more credits.`,
        variant: 'destructive',
      });
      return;
    }

    let imageUrl: string | undefined;

    // Upload image if selected
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadImageToStorage(selectedImage);
      } catch (error) {
        console.error('Error uploading image:', error);
        toast({
          title: 'Upload Failed',
          description: 'Failed to upload image. Please try again.',
          variant: 'destructive',
        });
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage.trim() || '(Image attached)',
      timestamp: new Date(),
      imageUrl,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    removeImage();
    setIsLoading(true);

    try {
      const functions = getFunctions();
      const chatWithAdvisor = httpsCallable(functions, 'chatWithAdvisor');

      // Prepare conversation history
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        imageUrl: msg.imageUrl,
      }));

      const response = await chatWithAdvisor({
        advisorSlug: advisor.slug,
        userMessage: userMessage.content,
        imageUrl: imageUrl,
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
            className="hover:bg-[#5D4E37] hover:text-white active:bg-[#5D4E37]/80 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" data-tour="conversation-history">
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
              <div className="space-y-2 max-w-[75%]">
                <div
                  className={`rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-[#006B3E] text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.imageUrl && (
                    <div className="mb-2 relative w-full max-w-sm rounded-lg overflow-hidden border-2 border-white/20">
                      <Image
                        src={msg.imageUrl}
                        alt="Uploaded image"
                        width={400}
                        height={300}
                        className="object-contain w-full h-auto"
                        unoptimized
                      />
                    </div>
                  )}
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
                {msg.role === 'assistant' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800"
                    onClick={() => window.location.href = `/dispensaries/near-me?advisor=${advisor.slug}`}
                    data-tour="advisor-suggestions"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Find Near Me
                  </Button>
                )}
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
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2" data-tour="earn-credits">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-amber-800 font-medium">Low Credits</p>
              <p className="text-amber-700">
                You need at least {estimatedCost} credits to send this message. Please purchase more credits.
              </p>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imagePreview && (
          <div className="mb-3 relative inline-block">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-[#006B3E]">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              disabled={isLoading || isUploadingImage}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            disabled={isLoading || isUploadingImage}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isUploadingImage || !!selectedImage}
            className="shrink-0 hover:bg-[#006B3E] hover:text-white transition-colors"
          >
            {isUploadingImage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
          </Button>
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Shift+Enter for new line)"
            disabled={isLoading || !currentUser || isUploadingImage}
            className="min-h-[60px] max-h-[120px] resize-none"
            rows={2}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || (!inputMessage.trim() && !selectedImage) || !currentUser || (currentUser.credits || 0) < estimatedCost || isUploadingImage}
            className="bg-[#006B3E] hover:bg-[#5D4E37] active:bg-[#005030] px-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
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
            Estimated: ~{estimatedCost} credits {selectedImage && '(+10 for image)'}
          </span>
        </div>
      </div>
    </div>
  );
}

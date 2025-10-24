'use client';

import { useRef, useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from "@/client/components/ui/button";

interface ConversationProps {
  children: ReactNode;
}

export const Conversation = ({ children }: ConversationProps) => {
  return (
    <div className="relative flex-1 overflow-hidden">
      {children}
    </div>
  );
};

interface ConversationContentProps {
  children: ReactNode;
}

export const ConversationContent = ({ children }: ConversationContentProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new content is added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [children]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto scroll-smooth px-4 py-6"
      id="conversation-content"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {children}
      </div>
    </div>
  );
};

export const ConversationScrollButton = () => {
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const container = document.getElementById('conversation-content');
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    const container = document.getElementById('conversation-content');
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <Button
        onClick={scrollToBottom}
        size="sm"
        variant="secondary"
        className="rounded-full shadow-lg"
      >
        <ChevronDown className="h-4 w-4" />
        <span>Scroll to bottom</span>
      </Button>
    </div>
  );
};

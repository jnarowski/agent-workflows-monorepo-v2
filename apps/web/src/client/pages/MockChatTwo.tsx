import { useState, useRef, useEffect } from 'react';
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function MockChatTwo() {
  const [messages, setMessages] = useState([
    { id: 1, from: 'user', text: 'Hello! Can you help me with my project?' },
    { id: 2, from: 'assistant', text: 'Of course! I\'d be happy to help you with your project. What do you need assistance with?' },
    { id: 3, from: 'user', text: 'I need to create a chat interface with a scrollable message area.' },
    { id: 4, from: 'assistant', text: 'That\'s a great project! A chat interface typically consists of a few key components:\n\n1. A scrollable container for messages\n2. Individual message components\n3. An input area for typing new messages\n4. Proper styling to make it look clean and professional\n\nWould you like me to walk you through each component?' },
    { id: 5, from: 'user', text: 'Yes, that would be helpful. How do I make sure the input stays at the bottom?' },
    { id: 6, from: 'assistant', text: 'To keep the input at the bottom, you can use CSS positioning. Here are a few approaches:\n\n1. **Fixed positioning**: Position the input as `position: fixed` at the bottom\n2. **Flexbox**: Use `display: flex` with `flex-direction: column` on the parent\n3. **Grid**: Use CSS Grid with defined rows\n\nThe most common approach is to use flexbox or fixed positioning. With fixed positioning, you\'ll need to add padding to the chat container to prevent messages from being hidden behind the input.' },
    { id: 7, from: 'user', text: 'What about scrolling behavior? Should it auto-scroll to the bottom?' },
    { id: 8, from: 'assistant', text: 'Yes, auto-scrolling is a common UX pattern in chat applications! You typically want to:\n\n1. Auto-scroll when new messages arrive\n2. Only auto-scroll if the user is near the bottom (to avoid disrupting reading)\n3. Provide a "scroll to bottom" button when the user scrolls up\n\nYou can implement this using `scrollIntoView()` or by setting `scrollTop` to `scrollHeight`.' },
    { id: 9, from: 'user', text: 'That makes sense. What about styling the messages differently for user vs assistant?' },
    { id: 10, from: 'assistant', text: 'Great question! Common patterns include:\n\n- **Alignment**: User messages on the right, assistant on the left\n- **Colors**: Different background colors for each sender\n- **Avatars**: Show user/assistant icons\n- **Timestamps**: Display when messages were sent\n- **Styling**: Rounded corners, padding, shadows for depth\n\nYou can use conditional classes based on the message sender to apply different styles.' },
    { id: 11, from: 'user', text: 'How do I handle really long messages? Should they wrap?' },
    { id: 12, from: 'assistant', text: 'Yes, long messages should definitely wrap! Use `word-wrap: break-word` or `overflow-wrap: break-word` to handle long words. You should also:\n\n1. Set a max-width on message bubbles (e.g., 70% of container)\n2. Allow text to wrap naturally\n3. Preserve whitespace if needed with `white-space: pre-wrap`\n4. Consider markdown rendering for formatted text\n\nThis ensures readability and prevents horizontal scrolling.' },
    { id: 13, from: 'user', text: 'What about mobile responsiveness?' },
    { id: 14, from: 'assistant', text: 'Mobile responsiveness is crucial for chat interfaces! Key considerations:\n\n1. **Touch targets**: Make buttons/inputs at least 44px tall\n2. **Virtual keyboard**: Account for keyboard appearing/disappearing\n3. **Max widths**: Increase message max-width on mobile (90-95%)\n4. **Font sizes**: Ensure text is readable (minimum 16px)\n5. **Fixed positioning**: Be careful with fixed elements and mobile keyboards\n\nYou might want to use viewport units (vh/vw) carefully and test on actual devices.' },
    { id: 15, from: 'user', text: 'This is really helpful, thank you!' },
    { id: 16, from: 'assistant', text: 'You\'re welcome! Feel free to ask if you have any more questions as you build your chat interface. Good luck with your project!' },
  ]);

  const [inputValue, setInputValue] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessage = {
      id: messages.length + 1,
      from: 'user',
      text: inputValue,
    };

    setMessages([...messages, newMessage]);
    setInputValue('');

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage = {
        id: messages.length + 2,
        from: 'assistant',
        text: 'This is a simulated response. In a real application, this would come from your backend or AI service.',
      };
      setMessages(prev => [...prev, assistantMessage]);
    }, 1000);
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "350px",
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-gray-100">
          {/* Header */}
          <div className="px-6 py-4 bg-white border-b border-gray-200 shadow-sm">
            <h1 className="text-xl font-semibold m-0">Mock Chat Interface</h1>
          </div>

          {/* Chat Messages Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 flex flex-col gap-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 rounded-xl shadow-sm break-words whitespace-pre-wrap ${
                    message.from === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-800'
                  }`}
                >
                  <div className="font-semibold text-xs mb-1 opacity-80">
                    {message.from === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="text-sm leading-relaxed">
                    {message.text}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fixed Input Container at Bottom */}
          <div className="px-6 py-4 bg-white border-t border-gray-200 shadow-lg">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-lg outline-none transition-colors focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className={`px-6 py-3 text-sm font-semibold rounded-lg transition-colors ${
                  inputValue.trim()
                    ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer'
                    : 'bg-gray-300 text-white cursor-not-allowed'
                }`}
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

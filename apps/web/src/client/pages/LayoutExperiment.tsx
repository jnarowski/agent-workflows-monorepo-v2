/**
 * Experimental layout page to test fixed bottom input
 */
import { useState } from "react";

export default function LayoutExperiment() {
  const [inputValue, setInputValue] = useState("");

  // Generate lots of placeholder content
  const placeholderContent = Array.from({ length: 100 }, (_, i) => (
    <div key={i} className="p-4 mb-2 bg-muted rounded-lg">
      <p className="font-medium">Message {i + 1}</p>
      <p className="text-sm text-muted-foreground">
        This is placeholder content to make the page scroll. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
      </p>
    </div>
  ));

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto">
          {placeholderContent}
        </div>
      </div>

      {/* Fixed input at bottom */}
      <div className="shrink-0 border-t bg-background p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

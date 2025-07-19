"use client";
import { useChat } from "ai/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto stretch">
      <div className="flex-grow space-y-4 mb-24">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`whitespace-pre-wrap flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`p-3 rounded-lg max-w-lg ${
                m.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              <span className="font-bold block mb-1">
                {m.role === "user" ? "You" : "Gemini"}
              </span>
              {m.content}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          className="fixed bottom-0 w-full max-w-2xl p-4 mb-8 border border-gray-300 rounded-lg shadow-xl"
          value={input}
          placeholder="Ask for a movie recommendation..."
          onChange={handleInputChange}
        />
      </form>
    </div>
  );
}

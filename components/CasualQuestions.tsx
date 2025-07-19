// components/CasualQuestions.tsx

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  {
    question: "A perfect movie night for me is...",
    options: [
      "Action-packed and exciting",
      "Funny and lighthearted",
      "Thought-provoking and deep",
      "A classic I can watch again",
    ],
  },
  {
    question: "I prefer movies that are...",
    options: [
      "Critically acclaimed",
      "Popular and well-known",
      "Hidden gems",
      "Visually stunning",
    ],
  },
  {
    question: "When it comes to plot, I enjoy...",
    options: [
      "Complex twists and turns",
      "A straightforward, strong story",
      "Character-driven stories",
      "Mind-bending or abstract concepts",
    ],
  },
];

export function CasualQuestions() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit(newAnswers);
    }
  };

  const handleSubmit = async (finalAnswers: string[]) => {
    setIsLoading(true);
    await fetch("/api/casual-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: finalAnswers }),
    });
    router.refresh();
  };

  if (isLoading) {
    return <div className="text-center p-8">Saving your preferences...</div>;
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-lg shadow-md text-center animate-fadeIn">
      <h2 className="text-2xl font-bold mb-4">Just a few more questions...</h2>
      <p className="text-lg text-gray-700 mb-6">
        {QUESTIONS[currentStep].question}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {QUESTIONS[currentStep].options.map((option) => (
          <button
            key={option}
            onClick={() => handleAnswer(option)}
            className="w-full p-4 bg-gray-100 rounded-lg hover:bg-primary hover:text-white transition-colors duration-200"
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

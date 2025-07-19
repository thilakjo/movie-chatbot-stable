// components/LoadingAnimation.tsx

"use client";
import Lottie from "lottie-react";
// Make sure you download a Lottie JSON file and place it in your /public folder
import animationData from "../public/movie-loading.json";

export const LoadingAnimation = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Lottie
        animationData={animationData}
        style={{ width: 300, height: 300 }}
      />
      <p className="text-lg font-semibold text-gray-600">
        Finding your next favorite movie...
      </p>
    </div>
  );
};

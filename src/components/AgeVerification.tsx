"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

interface AgeVerificationProps {
  onVerify: () => void;
}

export default function AgeVerification({ onVerify }: AgeVerificationProps) {
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400">
            You must be 18 or older to access this content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="bg-red-500/10 p-4 rounded-full">
            <ShieldAlert className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Age Verification</h1>
        <p className="text-gray-400 mb-2 text-sm uppercase tracking-widest font-semibold">
          Adults Only — 18+
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-left">
          <p className="text-yellow-300 text-sm leading-relaxed">
            This website contains adult content including explicit images and
            videos. By entering, you confirm that:
          </p>
          <ul className="text-yellow-200/80 text-sm mt-2 space-y-1 list-disc list-inside">
            <li>You are 18 years of age or older</li>
            <li>Adult content is legal in your jurisdiction</li>
            <li>You consent to viewing adult content</li>
            <li>You accept our Terms of Service</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onVerify}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200"
          >
            I am 18+ — Enter
          </button>
          <button
            onClick={() => setDeclined(true)}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium py-3 px-6 rounded-xl transition-colors duration-200"
          >
            I am under 18 — Exit
          </button>
        </div>

        <p className="text-gray-600 text-xs mt-4">
          All content is AI-generated. No real persons are depicted.
        </p>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";

export default function CrisisReportWithVRF() {
    const [formData, setFormData] = useState({
        name: "",
        photo: "",
        content: ""
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [ counselorAddress, setCounselorAddress] = useState("");

    // Hardcoded counselor addresses for random assignment
    const counselorAddresses = [
        "0x8ca12a3f40e6b6a2ac6ca70c4244e0163d71bf1ccbba6bcd3a33c8ff9cdd1a3a",
        "0x7b9f4e2d1c8a5f6b3e9c2d8a4f7b1e5c9a2d6f8b3e7a1c5f9b2e6d8a4c7f1b9e",
        "0x5f2e8a1c9b4d7f3a6e2c8b5f1d9a4e7c2b6f9a3d8e1c5b7f2a9d6e3c8b4f7a1e"
    ];

    interface FormData {
        name: string;
        photo: string;
        content: string;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value } as FormData));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.content.trim()) {
            alert("Please fill in name and crisis details.");
            return;
        }

        setIsSubmitting(true);

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Always succeed and assign random counselor
        const randomCounselor = counselorAddresses[Math.floor(Math.random() * counselorAddresses.length)];
        setCounselorAddress(randomCounselor);
        setIsSubmitted(true);
        setIsSubmitting(false);
    };

    const handleSubmitAnother = () => {
        setIsSubmitted(false);
        setFormData({ name: "", photo: "", content: "" });
        setCounselorAddress("");
    };

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
                    <div className="text-green-500 text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Report Submitted Successfully!</h2>
                    <p className="text-gray-600 mb-4">Your crisis report has been submitted and processed.</p>
                    
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                        <h3 className="font-semibold text-blue-900 mb-2">Counselor Assigned</h3>
                        <p className="text-sm font-mono text-blue-800 break-all">
                        0x9bb19b06b87daa9d7e959ad833de07efad43155091b1622078089138e1b83808
                        </p>
                    </div>

                    <button
                        onClick={handleSubmitAnother}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                        Submit Another Report
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                        <h1 className="text-2xl font-bold text-white">Crisis Report </h1>
                        <p className="text-blue-100">Submit your crisis report (Always succeeds)</p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Enter your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Photo URL (Optional)</label>
                            <input
                                type="url"
                                name="photo"
                                value={formData.photo}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="https://example.com/photo.jpg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Crisis Report Details *</label>
                            <textarea
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                required
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Describe the crisis situation..."
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {isSubmitting ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                </span>
                            ) : (
                                'Submit Crisis Report'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
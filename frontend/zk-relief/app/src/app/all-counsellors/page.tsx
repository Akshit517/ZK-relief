"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Counsellor {
    id: string;
    name: string;
    specialty: string;
    experience: string;
    availability: "available" | "busy" | "offline";
    rating: number;
    image: string;
    description: string;
    languages: string[];
}

export default function AllCounsellorsPage() {
    const router = useRouter();
    const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
    const [filteredCounsellors, setFilteredCounsellors] = useState<Counsellor[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSpecialty, setSelectedSpecialty] = useState("all");
    const [loading, setLoading] = useState(true);

    // Mock data - replace with actual API call
    const mockCounsellors: Counsellor[] = [
        {
            id: "1",
            name: "Dr. Sarah Johnson",
            specialty: "Trauma Counseling",
            experience: "8+ years",
            availability: "available",
            rating: 4.9,
            image: "/api/placeholder/150/150",
            description: "Specialized in helping individuals overcome trauma and build resilience.",
            languages: ["English", "Spanish"]
        },
        {
            id: "2",
            name: "Dr. Michael Chen",
            specialty: "Workplace Issues",
            experience: "12+ years",
            availability: "busy",
            rating: 4.8,
            image: "/api/placeholder/150/150",
            description: "Expert in workplace harassment, discrimination, and professional counseling.",
            languages: ["English", "Mandarin"]
        },
        {
            id: "3",
            name: "Dr. Emily Rodriguez",
            specialty: "Crisis Intervention",
            experience: "6+ years",
            availability: "available",
            rating: 4.7,
            image: "/api/placeholder/150/150",
            description: "Immediate support for crisis situations and emergency counseling.",
            languages: ["English", "Spanish", "Portuguese"]
        },
        {
            id: "4",
            name: "Dr. James Wilson",
            specialty: "Legal Support Counseling",
            experience: "10+ years",
            availability: "offline",
            rating: 4.6,
            image: "/api/placeholder/150/150",
            description: "Counseling support for individuals going through legal processes.",
            languages: ["English"]
        },
        {
            id: "5",
            name: "Dr. Priya Patel",
            specialty: "Mental Health",
            experience: "7+ years",
            availability: "available",
            rating: 4.8,
            image: "/api/placeholder/150/150",
            description: "Comprehensive mental health support and therapy services.",
            languages: ["English", "Hindi", "Gujarati"]
        },
        {
            id: "6",
            name: "Dr. Robert Kim",
            specialty: "Family Counseling",
            experience: "15+ years",
            availability: "available",
            rating: 4.9,
            image: "/api/placeholder/150/150",
            description: "Family dynamics, relationship counseling, and conflict resolution.",
            languages: ["English", "Korean"]
        }
    ];

    useEffect(() => {
        // Simulate API loading
        setTimeout(() => {
            setCounsellors(mockCounsellors);
            setFilteredCounsellors(mockCounsellors);
            setLoading(false);
        }, 1000);
    }, []);

    useEffect(() => {
        let filtered = counsellors;

        if (searchTerm) {
            filtered = filtered.filter(counsellor =>
                counsellor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                counsellor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedSpecialty !== "all") {
            filtered = filtered.filter(counsellor =>
                counsellor.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
            );
        }

        setFilteredCounsellors(filtered);
    }, [searchTerm, selectedSpecialty, counsellors]);

    const goBack = () => {
        router.back();
    };

    const getAvailabilityColor = (availability: string) => {
        switch (availability) {
            case "available":
                return "bg-green-100 text-green-800";
            case "busy":
                return "bg-yellow-100 text-yellow-800";
            case "offline":
                return "bg-gray-100 text-gray-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const getAvailabilityDot = (availability: string) => {
        switch (availability) {
            case "available":
                return "bg-green-400";
            case "busy":
                return "bg-yellow-400";
            case "offline":
                return "bg-gray-400";
            default:
                return "bg-gray-400";
        }
    };

    const handleBookSession = (counsellorId: string) => {
        // Handle booking logic here
        console.log("Booking session with counsellor:", counsellorId);
        // You can navigate to a booking page or open a modal
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="flex flex-col items-center">
                        <svg className="animate-spin h-12 w-12 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-600">Loading counsellors...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <button
                                onClick={goBack}
                                className="mr-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back
                            </button>
                            <h1 className="text-2xl font-bold text-gray-900">All Counsellors</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">Professional Support</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Search counsellors..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                            />
                        </div>

                        {/* Specialty Filter */}
                        <div>
                            <select
                                value={selectedSpecialty}
                                onChange={(e) => setSelectedSpecialty(e.target.value)}
                                className="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                            >
                                <option value="all">All Specialties</option>
                                <option value="trauma">Trauma Counseling</option>
                                <option value="workplace">Workplace Issues</option>
                                <option value="crisis">Crisis Intervention</option>
                                <option value="legal">Legal Support</option>
                                <option value="mental">Mental Health</option>
                                <option value="family">Family Counseling</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Counsellors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCounsellors.map((counsellor) => (
                        <div key={counsellor.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                            {/* Profile Image */}
                            <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-500">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                </div>
                                {/* Availability Indicator */}
                                <div className="absolute top-4 right-4">
                                    <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(counsellor.availability)}`}>
                                        <div className={`w-2 h-2 rounded-full mr-1 ${getAvailabilityDot(counsellor.availability)}`}></div>
                                        {counsellor.availability}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{counsellor.name}</h3>
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="text-sm text-gray-600">{counsellor.rating}</span>
                                    </div>
                                </div>

                                <p className="text-sm text-indigo-600 font-medium mb-1">{counsellor.specialty}</p>
                                <p className="text-sm text-gray-500 mb-3">{counsellor.experience} experience</p>
                                <p className="text-sm text-gray-600 mb-4">{counsellor.description}</p>

                                {/* Languages */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {counsellor.languages.map((lang) => (
                                        <span key={lang} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                            {lang}
                                        </span>
                                    ))}
                                </div>

                                {/* Action Button */}
                                <button
                                    onClick={() => handleBookSession(counsellor.id)}
                                    disabled={counsellor.availability === "offline"}
                                    className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                                        counsellor.availability === "offline"
                                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                            : counsellor.availability === "busy"
                                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                            : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
                                    }`}
                                >
                                    {counsellor.availability === "offline"
                                        ? "Currently Offline"
                                        : counsellor.availability === "busy"
                                        ? "Join Waiting List"
                                        : "Book Session"
                                    }
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results */}
                {filteredCounsellors.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No counsellors found</h3>
                        <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
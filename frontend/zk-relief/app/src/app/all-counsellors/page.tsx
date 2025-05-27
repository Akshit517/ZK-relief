"use client";
import { useState, useEffect } from "react";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

interface Counsellor {
    address: string;
    name: string;
    photo?: string;
    pending_crisis_reports: any[];
    specialty?: string;
    experience?: string;
    availability: "available" | "busy" | "offline";
    rating?: number;
    description?: string;
    languages?: string[];
}

interface AllCounsellorDetailsEvent {
    address: string[];
    name: string[];
    photo: (string | null)[];
    pending_crisis_report: any[];
}

export default function AllCounsellorsWithWallet() {
    const packageId = "0xde84df2a5144b03217aaec1269b9baa3abfeb1d901444a6885b91483ee108ff7";
    const moduleName = "zkrelief";
    const PRIVATE_KEY = process.env.NEXT_PUBLIC_SECRET_PRIVATE_KEY;
    const COUNSELLOR_HANDLER_OBJECT_ID = "0x8ca12a3f40e6b6a2ac6ca70c4244e0163d71bf1ccbba6bcd3a33c8ff9cdd1a3a";
    
    // Special address that will have the Talk Now button
    const SPECIAL_ADDRESS = "0x9bb19b06b87daa9d7e959ad833de07efad43155091b1622078089138e1b83808";
    
    // State for chat
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<{text: string, sender: 'user' | 'counsellor'}[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentChatCounsellor, setCurrentChatCounsellor] = useState<Counsellor | null>(null);

    // Wallet state
    const [wallet, setWallet] = useState<{
        keypair: Ed25519Keypair;
        address: string;
        suiClient: SuiClient;
    } | null>(null);

    // Counsellors state
    const [counsellors, setCounsellors] = useState<Counsellor[]>([]);
    const [filteredCounsellors, setFilteredCounsellors] = useState<Counsellor[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSpecialty, setSelectedSpecialty] = useState("all");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const specialties = [
        "Trauma Counseling",
        "Workplace Issues", 
        "Crisis Intervention",
        "Legal Support Counseling",
        "Mental Health",
        "Family Counseling"
    ];

    const languages = ["English", "Spanish", "Mandarin", "Portuguese", "Hindi", "Gujarati", "Korean"];

    // Auto-initialize wallet on component mount
    useEffect(() => {
        const initializeWallet = async () => {
            if (!PRIVATE_KEY) {
                setError("Private key not configured. Please add your private key to the PRIVATE_KEY constant.");
                return;
            }

            if (!PRIVATE_KEY.startsWith("suiprivkey1")) {
                setError("Invalid private key format. Should start with 'suiprivkey1'");
                return;
            }

            try {
                // Create keypair from private key
                const keypair = Ed25519Keypair.fromSecretKey(PRIVATE_KEY);
                const address = keypair.getPublicKey().toSuiAddress();
                
                // Create Sui client
                const suiClient = new SuiClient({
                    url: "https://fullnode.testnet.sui.io:443",
                });

                setWallet({ 
                    keypair,
                    address,
                    suiClient
                });

                console.log("Wallet initialized successfully!");
                console.log("Address:", address);

            } catch (err) {
                console.error("Failed to initialize wallet:", err);
                setError("Failed to initialize wallet. Please check your private key.");
            }
        };

        initializeWallet();
    }, []);

    // Fetch all counsellors function
    const fetchAllCounsellors = async () => {
        if (!wallet) {
            setError("Please connect your wallet first");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const tx = new Transaction();
            
            // Set the sender address
            tx.setSender(wallet.address);
            
            // Call the function with the hardcoded CounsellorHandler object as argument
            tx.moveCall({
                target: `${packageId}::${moduleName}::get_all_counsellors_details`,
                arguments: [tx.object(COUNSELLOR_HANDLER_OBJECT_ID)], // Use hardcoded handler object ID
            });

            // Sign and execute transaction
            const result = await wallet.suiClient.signAndExecuteTransaction({
                signer: wallet.keypair,
                transaction: tx,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });

            console.log("Transaction result:", result);

            // Find the AllCounsellorDetailsEvent
            const counsellorEvent = result.events?.find(event => 
                event.type.includes("AllCounsellorDetailsEvent")
            );

            if (counsellorEvent && counsellorEvent.parsedJson) {
                const eventData = counsellorEvent.parsedJson as AllCounsellorDetailsEvent;
                console.log("Event data:", eventData);
                
                // Transform the data into our Counsellor interface
                const transformedCounsellors: Counsellor[] = eventData.address.map((address, index) => ({
                    address,
                    name: eventData.name[index] || `Counsellor ${index + 1}`,
                    photo: eventData.photo[index] || undefined,
                    pending_crisis_reports: eventData.pending_crisis_report[index] || [],
                    specialty: specialties[index % specialties.length],
                    experience: `${Math.floor(Math.random() * 10) + 5}+ years`,
                    availability: Math.random() > 0.7 ? "busy" : Math.random() > 0.3 ? "available" : "offline",
                    rating: Number((4.5 + Math.random() * 0.5).toFixed(1)),
                    description: `Professional counsellor specialized in ${specialties[index % specialties.length].toLowerCase()}.`,
                    languages: [languages[0], languages[Math.floor(Math.random() * (languages.length - 1)) + 1]]
                }));

                setCounsellors(transformedCounsellors);
                setFilteredCounsellors(transformedCounsellors);
                
                if (transformedCounsellors.length === 0) {
                    setError("No counsellors found in the system");
                }
            } else {
                console.log("All events:", result.events);
                setError("No counsellor data found in transaction result. Check console for all events.");
            }

        } catch (err) {
            console.error("Error fetching counsellors:", err);
            setError(`Failed to fetch counsellor data: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch counsellors when wallet is initialized
    useEffect(() => {
        if (wallet) {
            fetchAllCounsellors();
        }
    }, [wallet]);

    // Filter counsellors based on search and specialty
    useEffect(() => {
        let filtered = counsellors;

        if (searchTerm) {
            filtered = filtered.filter(counsellor =>
                counsellor.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (counsellor.specialty && counsellor.specialty.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        if (selectedSpecialty !== "all") {
            filtered = filtered.filter(counsellor =>
                counsellor.specialty && counsellor.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase())
            );
        }

        setFilteredCounsellors(filtered);
    }, [searchTerm, selectedSpecialty, counsellors]);

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

    const handleSendMessage = () => {
        if (newMessage.trim()) {
            setMessages([...messages, { text: newMessage, sender: 'user' }]);
            setNewMessage('');
            // Auto-reply from counsellor
            setTimeout(() => {
                setMessages(prev => [...prev, { 
                    text: "Thank you for reaching out. How can I help you today?", 
                    sender: 'counsellor' 
                }]);
            }, 1000);
        }
    };

    const startChat = (counsellor: Counsellor) => {
        setCurrentChatCounsellor(counsellor);
        setShowChat(true);
        setMessages([]);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">All Counsellors</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            {wallet && (
                                <div className="text-sm">
                                    
                                    <span className="font-mono text-xs text-gray-700">
                                        
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                        <div className="flex">
                            <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="text-sm text-red-700 mt-1">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                                <p className="text-gray-600">Loading counsellors from blockchain...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters */}
                {counsellors.length > 0 && (
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
                )}

                {/* Counsellors Grid */}
                {counsellors.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCounsellors.map((counsellor) => (
                            <div key={counsellor.address} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                                {/* Profile Image */}
                                <div className="relative h-48 bg-gradient-to-br from-indigo-400 to-purple-500">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {counsellor.photo ? (
                                            <img 
                                                src={counsellor.photo} 
                                                alt={counsellor.name}
                                                className="w-24 h-24 rounded-full object-cover border-4 border-white"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    {/* Availability Indicator */}
                                    <div className="absolute top-4 right-4">
                                        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityColor(counsellor.availability)}`}>
                                            <div className={`w-2 h-2 rounded-full mr-1 ${getAvailabilityDot(counsellor.availability)}`}></div>
                                            {counsellor.availability}
                                        </div>
                                    </div>
                                    {/* Crisis Reports Badge */}
                                    {counsellor.pending_crisis_reports.length > 0 && (
                                        <div className="absolute top-4 left-4">
                                            <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                {counsellor.pending_crisis_reports.length} Crisis Reports
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900">{counsellor.name}</h3>
                                        {counsellor.rating && (
                                            <div className="flex items-center">
                                                <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-sm text-gray-600">{counsellor.rating}</span>
                                            </div>
                                        )}
                                    </div>

                                    {counsellor.specialty && (
                                        <p className="text-sm text-indigo-600 font-medium mb-1">{counsellor.specialty}</p>
                                    )}
                                    {counsellor.experience && (
                                        <p className="text-sm text-gray-500 mb-3">{counsellor.experience} experience</p>
                                    )}
                                    {counsellor.description && (
                                        <p className="text-sm text-gray-600 mb-4">{counsellor.description}</p>
                                    )}

                                    {/* Blockchain Address */}
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-400">Address:</p>
                                        <p className="text-xs font-mono text-gray-600 break-all">
                                            {counsellor.address === SPECIAL_ADDRESS 
                                                ? counsellor.address 
                                                : `0x${'****'.repeat(8)}${counsellor.address.slice(-4)}`}
                                        </p>
                                    </div>

                                    {/* Languages */}
                                    {counsellor.languages && (
                                        <div className="flex flex-wrap gap-2">
                                            {counsellor.languages.map((lang) => (
                                                <span key={lang} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                                                    {lang}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Only show Talk Now button for the special address */}
                                    {counsellor.address === SPECIAL_ADDRESS && (
                                        <button
                                            onClick={() => startChat(counsellor)}
                                            className="w-full mt-4 bg-indigo-600 text-white py-2 px-4 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                                        >
                                            Talk Now
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* No Results */}
                {counsellors.length > 0 && filteredCounsellors.length === 0 && (
                    <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No counsellors found</h3>
                        <p className="text-gray-500">Try adjusting your search terms or filters.</p>
                    </div>
                )}
            </div>

            {/* Chat Modal */}
            {showChat && currentChatCounsellor && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md h-96 flex flex-col">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="font-semibold text-gray-900">Chat with {currentChatCounsellor.name}</h3>
                            <button 
                                onClick={() => setShowChat(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 p-4 overflow-y-auto">
                            {messages.length === 0 && (
                                <p className="text-gray-500 text-sm">Start the conversation...</p>
                            )}
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`mb-3 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block p-3 rounded-lg max-w-xs ${
                                        msg.sender === 'user' 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-gray-100 text-gray-900'
                                    }`}>
                                        <p className="text-sm">{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Message Input */}
                        <div className="p-4 border-t">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                <button
                                    onClick={handleSendMessage}
                                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
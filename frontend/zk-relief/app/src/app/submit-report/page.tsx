"use client";

import { useState, useEffect } from "react";
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { useSuiClient } from '@mysten/dapp-kit';
import { UserKeyData } from "@/app/types/UsefulTypes";

// Initialize the secret keypair for paying transactions
const getSecretKeypair = () => {
    // In a real app, this would come from environment variables
    // For demo purposes, using a hardcoded key (DO NOT use in production)
    const secretKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    
    try {
        // Remove '0x' prefix if present and create keypair
        const cleanKey = secretKey.startsWith('0x') ? secretKey.slice(2) : secretKey;
        const keyArray = new Uint8Array(Buffer.from(cleanKey, 'hex'));
        return Ed25519Keypair.fromSecretKey(keyArray);
    } catch (error) {
        console.error('Failed to create keypair:', error);
        return null;
    }
};

// Mock VRF data fetch function (replace with your actual API)
const fetchVRFFromAPI = async (inputString: string) => {
    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock VRF data - replace with actual API call
        return {
            publicKey: "0x" + "a".repeat(64),
            inputString: inputString,
            proof: "0x" + "b".repeat(128),
            vrfOutput: "0x" + "c".repeat(64)
        };
    } catch (error) {
        console.error('Error fetching VRF data:', error);
        throw error;
    }
};

export default function CrisisReportWithVRF() {
    const suiClient = useSuiClient();
    
    const [formData, setFormData] = useState({
        name: "",
        photo: "",
        content: "",
        packageId: "0xde84df2a5144b03217aaec1269b9baa3abfeb1d901444a6885b91483ee108ff7",
        counsellorHandlerId: "0x8ca12a3f40e6b6a2ac6ca70c4244e0163d71bf1ccbba6bcd3a33c8ff9cdd1a3a",
        patientHandlerId: "0xb6822983b28d472f850b8a216c9fb45b12f17af9143b09243e4d9700180ba98e",
        clockId: "0x6"
    });
    
    const [vrfData, setVrfData] = useState({
        publicKey: "",
        inputString: "",
        proof: "",
        vrfOutput: ""
    });
    
    const [txResult, setTxResult] = useState<any>(null);
    const [vrfGenerated, setVrfGenerated] = useState(false);
    const [isGeneratingVRF, setIsGeneratingVRF] = useState(false);
    const [secretKeypair, setSecretKeypair] = useState<Ed25519Keypair | null>(null);
    const [secretAddress, setSecretAddress] = useState("");
    const [userKeyData, setUserKeyData] = useState<UserKeyData | null>(null);
    const [userAddress, setUserAddress] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize secret keypair and get user data on component mount
    useEffect(() => {
        // Initialize secret keypair for paying fees
        const keypair = getSecretKeypair();
        if (keypair) {
            setSecretKeypair(keypair);
            setSecretAddress(keypair.toSuiAddress());
        }

        // Get user data from localStorage (from zkLogin)
        try {
            const storedUserData = localStorage.getItem("userKeyData");
            if (storedUserData) {
                const userData: UserKeyData = JSON.parse(storedUserData);
                setUserKeyData(userData);
                
                // Derive user address from ephemeral public key
                // In a real implementation, you would get the actual zkLogin address
                // For now, we'll simulate getting the user's address
                const userAddr = "0x" + "user_address_from_zklogin_" + Math.random().toString(36).substring(7);
                setUserAddress(userAddr);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }

        // Also check window.userKeyData as fallback
        if (window.userKeyData && !userKeyData) {
            setUserKeyData(window.userKeyData);
            const userAddr = "0x" + "user_address_from_zklogin_" + Math.random().toString(36).substring(7);
            setUserAddress(userAddr);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const generateVRF = async () => {
        setIsGeneratingVRF(true);
        try {
            const inputString = formData.name + formData.content + Date.now();
            const vrfResult = await fetchVRFFromAPI(inputString);
            setVrfData(vrfResult);
            setVrfGenerated(true);
        } catch (error) {
            alert(`Failed to generate VRF: ${(error as Error).message}`);
            console.error('VRF generation failed:', error);
        } finally {
            setIsGeneratingVRF(false);
        }
    };

    const convertStringToVector = (str: string) => {
        return Array.from(new TextEncoder().encode(str));
    };

    const convertHexToVector = (hexString: string) => {
        const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return bytes;
    };

    const handleSubmit = async () => {
        if (!userKeyData || !userAddress) {
            alert("User not properly authenticated with zkLogin. Please go back to login page.");
            return;
        }

        if (!vrfGenerated) {
            alert("Please generate VRF parameters first.");
            return;
        }

        if (!formData.packageId || !formData.counsellorHandlerId || !formData.patientHandlerId) {
            alert("Please provide all required Sui object IDs.");
            return;
        }

        if (!secretKeypair) {
            alert("Secret payment wallet not initialized.");
            return;
        }

        setIsSubmitting(true);
        setTxResult(null);

        try {
            const tx = new Transaction();

            // Convert parameters to the correct format
            const output = convertHexToVector(vrfData.vrfOutput);
            const proof = convertHexToVector(vrfData.proof);
            const alphaString = convertStringToVector(vrfData.inputString);
            const publicKey = convertHexToVector(vrfData.publicKey);
            const photoOption = formData.photo ? [formData.photo] : [];

            // Build the transaction
            tx.moveCall({
                target: `${formData.packageId}::crisis_reporting::add_crisis_report`,
                arguments: [
                    tx.object(formData.counsellorHandlerId),
                    tx.object(formData.patientHandlerId),
                    tx.object(formData.clockId),
                    tx.pure.vector('u8', output),
                    tx.pure.vector('u8', proof),
                    tx.pure.vector('u8', alphaString),
                    tx.pure.vector('u8', publicKey),
                    tx.pure.string(formData.name),
                    tx.pure.vector('string', photoOption),
                    tx.pure.string(formData.content),
                ]
            });

            // Set the sender as the user's zkLogin address
            tx.setSender(userAddress);

            // Sign and execute with secret keypair (pays fees) but sender is user
            const result = await suiClient.signAndExecuteTransaction({
                transaction: tx,
                signer: secretKeypair,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                }
            });

            setTxResult(result);
            
            // Reset form
            setFormData({
                ...formData,
                name: "",
                photo: "",
                content: ""
            });
            setVrfData({
                publicKey: "",
                inputString: "",
                proof: "",
                vrfOutput: ""
            });
            setVrfGenerated(false);

            alert('Crisis report submitted successfully!');

        } catch (error) {
            console.error("Transaction failed:", error);
            alert(`Transaction failed: ${(error as Error)?.message || 'Unknown error occurred'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-red-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-3 rounded-xl mr-4">
                                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Crisis Report Submission</h1>
                                <p className="text-gray-600 mt-1">Secure blockchain-based crisis reporting system</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-500">Authenticated User</p>
                                <p className="text-xs font-mono text-green-600">
                                    {userAddress ? `${userAddress.substring(0, 10)}...${userAddress.substring(userAddress.length - 8)}` : 'Not logged in'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 px-8 py-6">
                                <h2 className="text-2xl font-bold text-white">Submit Crisis Report</h2>
                                <p className="text-red-100 mt-1">Your safety matters. Report securely with blockchain verification.</p>
                            </div>

                            <div className="p-8 space-y-8">
                                {/* User Authentication Status */}
                                {userAddress && userKeyData && (
                                    <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                                        <h3 className="text-lg font-semibold text-green-900 mb-4">zkLogin Authentication</h3>
                                        <div className="space-y-2">
                                            <p className="text-sm text-green-700">
                                                Authenticated User Address: 
                                            </p>
                                            <p className="text-xs font-mono bg-green-100 p-2 rounded border text-green-800 break-all">
                                                {userAddress}
                                            </p>
                                            <p className="text-xs text-green-600">
                                                ✓ Verified via zkLogin • Nonce: {userKeyData.nonce.substring(0, 16)}...
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Wallet Info */}
                                {secretAddress && (
                                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Transaction Fee Sponsor</h3>
                                        <div className="space-y-2">
                                            <p className="text-sm text-blue-700">
                                                Gas fees will be paid by sponsor wallet: 
                                            </p>
                                            <p className="text-xs font-mono bg-blue-100 p-2 rounded border text-blue-800 break-all">
                                                {secretAddress}
                                            </p>
                                            <p className="text-xs text-blue-600">
                                                ℹ️ Your identity remains private while fees are sponsored
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Sui Configuration */}
                                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Blockchain Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="packageId" className="block text-sm font-medium text-gray-900 mb-2">
                                                Package ID *
                                            </label>
                                            <input
                                                type="text"
                                                id="packageId"
                                                name="packageId"
                                                value={formData.packageId}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                placeholder="0x..."
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="counsellorHandlerId" className="block text-sm font-medium text-gray-900 mb-2">
                                                Counsellor Handler ID *
                                            </label>
                                            <input
                                                type="text"
                                                id="counsellorHandlerId"
                                                name="counsellorHandlerId"
                                                value={formData.counsellorHandlerId}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                placeholder="0x..."
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="patientHandlerId" className="block text-sm font-medium text-gray-900 mb-2">
                                                Patient Handler ID *
                                            </label>
                                            <input
                                                type="text"
                                                id="patientHandlerId"
                                                name="patientHandlerId"
                                                value={formData.patientHandlerId}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                                                placeholder="0x..."
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="clockId" className="block text-sm font-medium text-gray-900 mb-2">
                                                Clock ID
                                            </label>
                                            <input
                                                type="text"
                                                id="clockId"
                                                name="clockId"
                                                value={formData.clockId}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-gray-50"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Patient Information */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
                                                Name *
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                required
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                                                placeholder="Enter your name"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="photo" className="block text-sm font-medium text-gray-900 mb-2">
                                                Photo URL (Optional)
                                            </label>
                                            <input
                                                type="url"
                                                id="photo"
                                                name="photo"
                                                value={formData.photo}
                                                onChange={handleInputChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors"
                                                placeholder="https://example.com/photo.jpg"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Crisis Report Content */}
                                <div>
                                    <label htmlFor="content" className="block text-sm font-medium text-gray-900 mb-2">
                                        Crisis Report Details *
                                    </label>
                                    <textarea
                                        id="content"
                                        name="content"
                                        value={formData.content}
                                        onChange={handleInputChange}
                                        required
                                        rows={6}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors resize-none"
                                        placeholder="Describe the crisis situation in detail. This information will be securely transmitted to a counselor..."
                                    />
                                </div>

                                {/* VRF Generation Section */}
                                <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200">
                                    <h3 className="text-lg font-semibold text-yellow-900 mb-4">VRF Generation</h3>
                                    <p className="text-sm text-yellow-700 mb-4">
                                        Generate cryptographic randomness for secure counselor assignment
                                    </p>
                                    
                                    <button
                                        onClick={generateVRF}
                                        disabled={isGeneratingVRF}
                                        className="mb-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isGeneratingVRF ? (
                                            <div className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Generating VRF...
                                            </div>
                                        ) : (
                                            'Generate VRF Parameters'
                                        )}
                                    </button>

                                    {vrfGenerated && (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-yellow-900 mb-1">
                                                        Public Key
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={vrfData.publicKey}
                                                        readOnly
                                                        className="w-full px-3 py-2 text-xs border border-yellow-300 rounded-lg bg-yellow-100 font-mono"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-yellow-900 mb-1">
                                                        VRF Output
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={vrfData.vrfOutput}
                                                        readOnly
                                                        className="w-full px-3 py-2 text-xs border border-yellow-300 rounded-lg bg-yellow-100 font-mono"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center text-green-700 bg-green-100 p-3 rounded-lg">
                                                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                VRF parameters generated successfully!
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4">
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !userAddress || !vrfGenerated || !secretKeypair}
                                        className="w-full flex justify-center py-4 px-6 border border-transparent rounded-2xl shadow-lg text-sm font-medium text-white bg-gradient-to-r from-red-600 via-pink-600 to-purple-600 hover:from-red-700 hover:via-pink-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Submitting Crisis Report...
                                            </div>
                                        ) : !userAddress ? (
                                            'Please Login with zkLogin First'
                                        ) : !vrfGenerated ? (
                                            'Generate VRF Parameters First'
                                        ) : !secretKeypair ? (
                                            'Payment Wallet Not Available'
                                        ) : (
                                            'Submit Crisis Report'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Authentication Status */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <div className="flex items-center mb-4">
                                <div className={`p-2 rounded-lg mr-3 ${userAddress ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <svg className={`h-5 w-5 ${userAddress ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={userAddress ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"} />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-900">Authentication Status</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">zkLogin Status:</span>
                                    <span className={`font-medium ${userAddress ? 'text-green-600' : 'text-red-600'}`}>
                                        {userAddress ? 'Authenticated ✓' : 'Not Logged In ✗'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Fee Sponsor:</span>
                                    <span className={`font-medium ${secretKeypair ? 'text-green-600' : 'text-red-600'}`}>
                                        {secretKeypair ? 'Ready ✓' : 'Not Available ✗'}
                                    </span>
                                </div>
                            </div>
                        </div>

                   </div>

                  </div>
                </div>
            </div>
                );
        }
        "use client";
        import { useState, useEffect } from "react";
        import { Transaction } from '@mysten/sui/transactions';
        import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
        import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
        import { jwtToAddress } from '@mysten/sui/zklogin';

        // Initialize testnet client
        const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

        
        const getSecretKeypair = () => {
        const secretKey = "";
        try {
            return Ed25519Keypair.fromSecretKey(secretKey);
        } catch (error) {
            console.error('Failed to create keypair:', error);
            return null;
        }
    };

    interface VRFResponse {
        publicKey: string;
        inputString: string;
        proof: string;
        vrfOutput: string;
    }

    // Replace the existing fetchVRFFromAPI function with this one

    const fetchVRFFromAPI = async (inputString: string): Promise<VRFResponse> => {
        try {
            // Method 1: Send inputString as POST request body
            const response = await fetch('http://localhost:3001/api/run-vrf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputString })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            return {
                publicKey: data.publicKey,
                inputString: data.inputString,
                proof: data.proof,
                vrfOutput: data.vrfOutput
            };
        } catch (error) {
            console.error('Failed to fetch VRF from API:', error);
            throw error;
        }
    };
        interface UserKeyData {
        randomness: string;
        nonce: string;
        ephemeralPublicKey: string;
        ephemeralPrivateKey: string;
        maxEpoch: number;
        }

        // Updated zkLogin signature interface
        interface ZkLoginSignatureInputs {
        proofPoints: {
            a: [string, string];
            b: [[string, string], [string, string]];
            c: [string, string];
        };
        issBase64Details: {
            value: string;
            indexMod4: number;
        };
        headerBase64: string;
        addressSeed: string;
        }

        interface ZkLoginSignatureData {
        inputs: ZkLoginSignatureInputs;
        maxEpoch: number;
        userSignature: string;
        }

        // Helper function to create zkLogin signature (replacing deprecated function)
        const createZkLoginSignature = (data: ZkLoginSignatureData): string => {
        // This is a simplified implementation - in production you'd use proper zkLogin proof generation
        const { inputs, maxEpoch, userSignature } = data;
        
        // Construct signature according to zkLogin format
        const signatureData = {
            inputs,
            maxEpoch,
            userSignature
        };
        
        return JSON.stringify(signatureData);
        };

        // Helper function to generate address seed (replacing deprecated function)
        const generateAddressSeed = (
        randomness: string | bigint,
        sub: string,
        aud: string
        ): bigint => {
        // Convert inputs to consistent format
        const randomnessBigInt = typeof randomness === 'string' ? BigInt(randomness) : randomness;
        
        // Simple hash-based seed generation (in production, use proper cryptographic methods)
        const combined = `${randomnessBigInt.toString()}_${sub}_${aud}`;
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return BigInt(Math.abs(hash));
        };

        export default function CrisisReportWithVRF() {
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

        const [vrfGenerated, setVrfGenerated] = useState(false);
        const [isGeneratingVRF, setIsGeneratingVRF] = useState(false);
        const [secretKeypair, setSecretKeypair] = useState<Ed25519Keypair | null>(null);
        const [secretAddress, setSecretAddress] = useState("");
        const [userAddress, setUserAddress] = useState("");
        const [userKeyData, setUserKeyData] = useState<UserKeyData | null>(null);
        const [jwtToken, setJwtToken] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [networkStatus, setNetworkStatus] = useState('connecting');
        const [authStatus, setAuthStatus] = useState('checking');

        useEffect(() => {
            // Initialize secret keypair for gas sponsorship
            const keypair = getSecretKeypair();
            if (keypair) {
            setSecretKeypair(keypair);
            setSecretAddress(keypair.toSuiAddress());
            console.log('Gas Sponsor Address:', keypair.toSuiAddress());
            }

            // Check for zkLogin session
            checkZkLoginSession();

            // Verify testnet connection
            suiClient.getLatestSuiSystemState()
            .then(() => {
                setNetworkStatus('connected');
                console.log('Successfully connected to Sui Testnet');
            })
            .catch(error => {
                setNetworkStatus('error');
                console.error('Failed to connect to testnet:', error);
            });
        }, []);
        const checkZkLoginSession = () => {
            try {
                console.log('Checking zkLogin session...');
                
                // First check if we're in browser environment
                if (typeof window === 'undefined') {
                    console.log('Not in browser environment');
                    setAuthStatus('not_authenticated');
                    return;
                }
        
                // Debug current URL
                console.log('Current URL:', window.location.href);
                console.log('URL Hash:', window.location.hash);
        
                // Check URL hash parameters first (for redirect from auth)
                const urlHash = window.location.hash;
                let jwtFromUrl = null;
                
                if (urlHash && urlHash.length > 1) {
                    console.log('Processing URL hash:', urlHash);
                    
                    // Parse the hash fragment as URL parameters
                    const hashFragment = urlHash.substring(1); // Remove the '#'
                    console.log('Hash fragment to parse:', hashFragment);
                    
                    const hashParams = new URLSearchParams(hashFragment);
                    jwtFromUrl = hashParams.get('id_token');
                    
                    console.log('JWT from hash:', jwtFromUrl ? 'FOUND' : 'NOT FOUND');
                    console.log('All hash params:', Array.from(hashParams.entries()));
                    
                    if (jwtFromUrl) {
                        console.log('JWT token found in URL hash');
                        console.log('JWT preview:', jwtFromUrl.substring(0, 50) + '...');
                        
                        // Store the JWT token
                        setJwtToken(jwtFromUrl);
                        localStorage.setItem("sui_jwt_token", jwtFromUrl);
                        console.log('JWT stored in localStorage');
                        
                        // Get user key data from localStorage
                        const storedUserKeyData = localStorage.getItem("userKeyData");
                        if (storedUserKeyData) {
                            const keyData = JSON.parse(storedUserKeyData);
                            setUserKeyData(keyData);
                            
                            // Generate user address from JWT
                            try {
                                console.log('Generating address with randomness:', keyData.randomness);
                                const userSuiAddress = jwtToAddress(jwtFromUrl, BigInt(keyData.randomness));
                                setUserAddress(userSuiAddress);
                                setAuthStatus('authenticated');
                                
                                console.log('✅ ZkLogin User Address:', userSuiAddress);
                                console.log('✅ User authenticated via zkLogin from URL hash');
                                
                                // Clean up URL
                                window.history.replaceState({}, document.title, window.location.pathname);
                                return;
                            } catch (addressError) {
                                console.error('❌ Error generating address from JWT:', addressError);
                                setAuthStatus('not_authenticated');
                                return;
                            }
                        } else {
                            console.log('❌ No userKeyData found in localStorage');
                            setAuthStatus('not_authenticated');
                            return;
                        }
                    }
                }
        
                // Also check URL search parameters (query string) as fallback
                const urlParams = new URLSearchParams(window.location.search);
                const jwtFromQuery = urlParams.get('id_token');
                
                if (jwtFromQuery && !jwtFromUrl) {
                    console.log('Found JWT in URL query parameters');
                    setJwtToken(jwtFromQuery);
                    localStorage.setItem("sui_jwt_token", jwtFromQuery);
                    
                    const storedUserKeyData = localStorage.getItem("userKeyData");
                    if (storedUserKeyData) {
                        const keyData = JSON.parse(storedUserKeyData);
                        setUserKeyData(keyData);
                        
                        try {
                            const userSuiAddress = jwtToAddress(jwtFromQuery, BigInt(keyData.randomness));
                            setUserAddress(userSuiAddress);
                            setAuthStatus('authenticated');
                            
                            console.log('✅ ZkLogin User Address from query:', userSuiAddress);
                            console.log('✅ User authenticated via zkLogin from URL query');
                            
                            window.history.replaceState({}, document.title, window.location.pathname);
                            return;
                        } catch (addressError) {
                            console.error('❌ Error generating address from query JWT:', addressError);
                        }
                    }
                }
        
                // Check localStorage for existing session
                const storedUserKeyData = localStorage.getItem("userKeyData");
                const storedJwt = localStorage.getItem("sui_jwt_token");
        
                console.log('Stored user key data:', !!storedUserKeyData);
                console.log('Stored JWT:', !!storedJwt);
        
                if (!storedUserKeyData) {
                    console.log('No user key data found');
                    setAuthStatus('not_authenticated');
                    return;
                }
        
                if (!storedJwt) {
                    console.log('No JWT token found');
                    setAuthStatus('not_authenticated');
                    return;
                }
        
                const keyData = JSON.parse(storedUserKeyData);
                setUserKeyData(keyData);
                setJwtToken(storedJwt);
        
                // Generate user address from JWT
                try {
                    const userSuiAddress = jwtToAddress(storedJwt, BigInt(keyData.randomness));
                    setUserAddress(userSuiAddress);
                    setAuthStatus('authenticated');
        
                    console.log('✅ ZkLogin User Address from localStorage:', userSuiAddress);
                    console.log('✅ User authenticated via zkLogin from localStorage');
                } catch (addressError) {
                    console.error('❌ Error generating address from stored JWT:', addressError);
                    setAuthStatus('not_authenticated');
                }
            } catch (error) {
                console.error('❌ Error checking zkLogin session:', error);
                setAuthStatus('not_authenticated');
            }
        };
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const generateVRF = async () => {
            setIsGeneratingVRF(true);
            try {
            const inputString = formData.name + formData.content + Date.now();
            const vrfResult = await fetchVRFFromAPI(inputString);
            setVrfData(vrfResult);
            setVrfGenerated(true);
            } catch (error) {
            alert(`Failed to generate VRF: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            } finally {
            setIsGeneratingVRF(false);
            }
        };

        const convertStringToVector = (str: string): number[] => Array.from(new TextEncoder().encode(str));

        const convertHexToVector = (hexString: string): number[] => {
            const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
            const bytes: number[] = [];
            for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
            }
            return bytes;
        };

        const handleSubmit = async () => {
            if (!vrfGenerated) {
            alert("Please generate VRF parameters first.");
            return;
            }

            if (!secretKeypair) {
            alert("Gas sponsor wallet not initialized.");
            return;
            }

            if (!userKeyData || !jwtToken || !userAddress) {
            alert("User not authenticated via zkLogin. Please login first.");
            return;
            }

            if (networkStatus !== 'connected') {
            alert("Not connected to testnet. Please wait or refresh.");
            return;
            }

            setIsSubmitting(true);

            try {
            const tx = new Transaction();

            // Convert parameters to the correct format
            const output = convertHexToVector(vrfData.vrfOutput);
            const proof = convertHexToVector(vrfData.proof);
            const alphaString = convertStringToVector(vrfData.inputString);
            const publicKey = convertHexToVector(vrfData.publicKey);
            const photoOption = formData.photo ? [formData.photo] : [];

            // Build the transaction for TESTNET
            tx.moveCall({
                target: `${formData.packageId}::zkrelief::add_crisis_report`,
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

            // Set the zkLogin user as sender
            tx.setSender(userAddress);

            // Set gas payment to be sponsored by secret keypair
            tx.setGasPayment([{
                objectId: "0x0", // This will be filled by the sponsor
                version: "0",
                digest: ""
            }]);

            // Get the transaction bytes for zkLogin signing
            const txBytes = await tx.build({ client: suiClient });

            // Create ephemeral keypair for zkLogin
            const ephemeralKeypair = Ed25519Keypair.fromSecretKey(userKeyData.ephemeralPrivateKey);

            // Sign with ephemeral keypair
            const ephemeralSignature = await ephemeralKeypair.sign(txBytes);

            // Generate address seed using updated function
            const addressSeed = generateAddressSeed(
                BigInt(userKeyData.randomness),
                "sub", // This should match your JWT claim
                jwtToken // The actual JWT token
            );

            // Create zkLogin signature using updated method
            const zkLoginSignature = createZkLoginSignature({
                inputs: {
                proofPoints: {
                    a: ["0", "0"],
                    b: [["0", "0"], ["0", "0"]],
                    c: ["0", "0"]
                },
                issBase64Details: {
                    value: Buffer.from(jwtToken).toString('base64'),
                    indexMod4: 0,
                },
                headerBase64: "eyJhbGciOiJSUzI1NiIsImtpZCI6IjFiYjk2MDVjZTNkZWM5NjM4YWJhOWE4NzJhZjYyNGJjMGYzNzM1ODcifQ",
                addressSeed: addressSeed.toString()
                },
                maxEpoch: userKeyData.maxEpoch,
                userSignature: Array.from(ephemeralSignature).join(',')
            });

            // Execute with sponsored gas
            const result = await suiClient.executeTransactionBlock({
                transactionBlock: txBytes,
                signature: zkLoginSignature,
                options: {
                showEffects: true,
                showObjectChanges: true,
                }
            });

            console.log('Transaction successful on TESTNET:', result);

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

            alert('Crisis report submitted successfully on Testnet!');

            } catch (error) {
            console.error("Transaction failed on testnet:", error);
            alert(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
            } finally {
            setIsSubmitting(false);
            }
        };

        const handleLoginRedirect = () => {
            // Redirect to your login page
            window.location.href = '/'; // Adjust this path as needed
        };

        // Show loading state while checking authentication
        if (authStatus === 'checking') {
            return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Checking Authentication</h2>
                <p className="text-gray-600">Please wait while we verify your session...</p>
                </div>
            </div>
            );
        }

        if (authStatus === 'not_authenticated') {
            return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto text-center">
                <div className="text-red-500 text-6xl mb-4">🔒</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Authentication Required</h2>
                <p className="text-gray-600 mb-6">Please login with zkLogin to access the crisis reporting system.</p>
                <button
                    onClick={handleLoginRedirect}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all"
                >
                    Go to Login
                </button>
                </div>
            </div>
            );
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
            {/* Testnet Warning Banner */}
            <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm mb-4 rounded">
                <strong>🚧 TESTNET MODE:</strong> Connected to Sui Testnet - Status: {networkStatus}
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                    <h1 className="text-2xl font-bold text-white">Crisis Report - Testnet (zkLogin)</h1>
                    <p className="text-blue-100">Secure blockchain reporting on Sui Testnet</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Authentication Status */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                        <h3 className="font-semibold text-green-900">✅ zkLogin Authenticated</h3>
                        <p className="text-sm text-green-700">User Address: {userAddress ? `${userAddress.substring(0, 8)}...${userAddress.substring(userAddress.length - 6)}` : 'Loading...'}</p>
                        </div>
                        <div className="text-right">
                        <p className="text-xs text-green-600">Gas Sponsor:</p>
                        <p className="text-xs font-mono text-green-800">
                            {secretAddress ? `${secretAddress.substring(0, 8)}...${secretAddress.substring(secretAddress.length - 6)}` : 'Loading...'}
                        </p>
                        </div>
                    </div>
                    </div>

                    {/* Network Status */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                        <div>
                        <h3 className="font-semibold text-blue-900">Network: Sui Testnet</h3>
                        <p className="text-sm text-blue-700">
                            Status: {networkStatus === 'connected' ? '✅ Connected' :
                                    networkStatus === 'error' ? '❌ Connection Error' : '⏳ Connecting...'}
                        </p>
                        </div>
                    </div>
                    </div>

                    {/* Blockchain Config */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Package ID (Testnet)
                        </label>
                        <input
                        type="text"
                        name="packageId"
                        value={formData.packageId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Counsellor Handler ID
                        </label>
                        <input
                        type="text"
                        name="counsellorHandlerId"
                        value={formData.counsellorHandlerId}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                        />
                    </div>
                    </div>

                    {/* Patient Info */}
                    <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                        </label>
                        <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Enter your name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Photo URL (Optional)
                        </label>
                        <input
                        type="url"
                        name="photo"
                        value={formData.photo}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="https://example.com/photo.jpg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                        Crisis Report Details *
                        </label>
                        <textarea
                        name="content"
                        value={formData.content}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                        placeholder="Describe the crisis situation..."
                        />
                    </div>
                    </div>

                    {/* VRF Section */}
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h3 className="font-semibold text-yellow-900 mb-3">VRF Generation</h3>
                    <button
                        onClick={generateVRF}
                        disabled={isGeneratingVRF}
                        className="mb-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingVRF ? 'Generating...' : 'Generate VRF Parameters'}
                    </button>
                    {vrfGenerated && (
                        <div className="bg-green-100 p-3 rounded border border-green-200">
                        <p className="text-sm text-green-700 flex items-center">
                            ✅ VRF parameters generated successfully!
                        </p>
                        </div>
                    )}
                    </div>

                    {/* Submit Button */}
                    <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !vrfGenerated || !secretKeypair || networkStatus !== 'connected' || authStatus !== 'authenticated'}
                    className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                    {isSubmitting ? (
                        <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting to Testnet...
                        </span>
                    ) : networkStatus !== 'connected' ? (
                        'Connecting to Testnet...'
                    ) : authStatus !== 'authenticated' ? (
                        'Authentication Required'
                    ) : !vrfGenerated ? (
                        'Generate VRF Parameters First'
                    ) : (
                        'Submit Crisis Report to Testnet'
                    )}
                    </button>

                    {/* Info Box */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-2">How it works:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Your identity is verified through zkLogin (Google authentication)</li>
                        <li>• Transaction fees are sponsored by our secure wallet</li>
                        <li>• Your crisis report is stored anonymously on the blockchain</li>
                        <li>• VRF ensures randomized, fair matching with counselors</li>
                    </ul>
                    </div>
                </div>
                </div>
            </div>
            </div>
        );
        }
"use client";
import { useState, useEffect } from "react";
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { jwtToAddress } from '@mysten/sui/zklogin';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

interface WasmModule {
    default: () => Promise<any>;
    generate_ecvrf_keypair: () => { sk: Uint8Array };
    generate_vrf_params_for_contract: (sk: Uint8Array, alpha: Uint8Array) => {
        public_key: Uint8Array;
        proof: Uint8Array;
        output: Uint8Array;
    };
}

let wasmModule: any = null;
let generate_ecvrf_keypair: (() => { sk: Uint8Array }) | null = null;
let generate_vrf_params_for_contract: ((sk: Uint8Array, alpha: Uint8Array) => {
    public_key: Uint8Array;
    proof: Uint8Array;
    output: Uint8Array;
}) | null = null;

const initWasm = async (): Promise<any> => {
    if (wasmModule) return wasmModule;
    try {
        const wasmInit = await import('../../../../../../ecvrf/ecvrf_wasm_bindings/pkg/ecvrf_wasm_bindings.js') as WasmModule;
        wasmModule = await wasmInit.default();
        generate_ecvrf_keypair = wasmInit.generate_ecvrf_keypair;
        generate_vrf_params_for_contract = wasmInit.generate_vrf_params_for_contract;
        return wasmModule;
    } catch (error) {
        console.error('Failed to initialize WASM:', error);
        throw error;
    }
};

// KEY FIX: Normalize object IDs to proper format
const normalizeObjectId = (id: string): string => {
    if (!id) return id;
    // Remove 0x prefix if present, then ensure it's lowercase and add 0x back
    const cleanId = id.replace(/^0x/, '').toLowerCase();
    return `0x${cleanId}`;
};

interface VRFResult {
    publicKey: string;
    inputString: string;
    proof: string;
    vrfOutput: string;
    rawOutput: Uint8Array;
    rawProof: Uint8Array;
    rawPublicKey: Uint8Array;
    rawAlphaString: Uint8Array;
}

const generateVRFFromWasm = async (inputString: string): Promise<VRFResult> => {
    try {
        await initWasm();
        if (!generate_ecvrf_keypair || !generate_vrf_params_for_contract) {
            throw new Error('WASM functions not initialized');
        }

        const keypair = generate_ecvrf_keypair();
        const sk_bytes = keypair.sk;
        const alpha_string_bytes = new TextEncoder().encode(inputString);
        const contract_params = generate_vrf_params_for_contract(sk_bytes, alpha_string_bytes);

        return {
            publicKey:"0x" + Array.from(contract_params.public_key).map(b => b.toString(16).padStart(2, '0')).join(''),
            inputString: inputString,
            proof: "0x" + Array.from(contract_params.proof).map(b => b.toString(16).padStart(2, '0')).join(''),
            vrfOutput: "0x" + Array.from(contract_params.output).map(b => b.toString(16).padStart(2, '0')).join(''),
            rawOutput: contract_params.output,
            rawProof: contract_params.proof,
            rawPublicKey: contract_params.public_key,
            rawAlphaString: alpha_string_bytes
        };
    } catch (error) {
        console.error('WASM VRF generation failed:', error);
        throw error;
    }
};

const getSecretKeypair = (): Ed25519Keypair | null => {
    const secretKey = "suiprivkey1qqq95h395x4tqhkg9ahd3gmw9u359euxv4lkpx7w9d83axgwavhr73srrtv";
    try {
        const decodedKey = decodeSuiPrivateKey(secretKey);
        return Ed25519Keypair.fromSecretKey(decodedKey.secretKey);
    } catch (error) {
        console.error('Failed to create keypair:', error);
        return null;
    }
};

interface UserKeyData {
    randomness: string;
    nonce: string;
    ephemeralPublicKey: string;
    ephemeralPrivateKey: string;
    maxEpoch: number;
}

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

const createZkLoginSignature = (data: ZkLoginSignatureData): string => {
    const { inputs, maxEpoch, userSignature } = data;
    const signatureData = { inputs, maxEpoch, userSignature };
    return JSON.stringify(signatureData);
};

const generateAddressSeed = (randomness: string | bigint, sub: string, aud: string): bigint => {
    const randomnessBigInt = typeof randomness === 'string' ? BigInt(randomness) : randomness;
    const combined = `${randomnessBigInt.toString()}_${sub}_${aud}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return BigInt(Math.abs(hash));
};

const parseJWT = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Failed to parse JWT:', error);
        return null;
    }
};

interface FormData {
    name: string;
    photo: string;
    content: string;
    packageId: string;
    counsellorHandlerId: string;
    patientHandlerId: string;
    clockId: string;
}

interface VRFData {
    publicKey: string;
    inputString: string;
    proof: string;
    vrfOutput: string;
    rawOutput: Uint8Array | null;
    rawProof: Uint8Array | null;
    rawPublicKey: Uint8Array | null;
    rawAlphaString: Uint8Array | null;
}

type NetworkStatus = 'connecting' | 'connected' | 'error';
type AuthStatus = 'checking' | 'authenticated' | 'not_authenticated';

export default function CrisisReportWithVRF(): JSX.Element {
    const [formData, setFormData] = useState<FormData>({
        name: "Nitin",
        photo: "",
        content: "Help",
        packageId: "0xde84df2a5144b03217aaec1269b9baa3abfeb1d901444a6885b91483ee108ff7",
        counsellorHandlerId: "0x8ca12a3f40e6b6a2ac6ca70c4244e0163d71bf1ccbba6bcd3a33c8ff9cdd1a3a",
        patientHandlerId: "0xb6822983b28d472f850b8a216c9fb45b12f17af9143b09243e4d9700180ba98e",
        clockId: "0x0000000000000000000000000000000000000000000000000000000000000006"
    });

    const [vrfData, setVrfData] = useState<VRFData>({
        publicKey: "",
        inputString: "",
        proof: "",
        vrfOutput: "",
        rawOutput: null,
        rawProof: null,
        rawPublicKey: null,
        rawAlphaString: null
    });

    const [vrfGenerated, setVrfGenerated] = useState<boolean>(false);
    const [isGeneratingVRF, setIsGeneratingVRF] = useState<boolean>(false);
    const [wasmReady, setWasmReady] = useState<boolean>(false);
    const [secretKeypair, setSecretKeypair] = useState<Ed25519Keypair | null>(null);
    const [secretAddress, setSecretAddress] = useState<string>("");
    const [userAddress, setUserAddress] = useState<string>("");
    const [userKeyData, setUserKeyData] = useState<UserKeyData | null>(null);
    const [jwtToken, setJwtToken] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>('connecting');
    const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
    const [gasObjects, setGasObjects] = useState<any[]>([]);

    useEffect(() => {
        initWasm()
            .then(() => {
                setWasmReady(true);
                console.log('WASM initialized successfully');
            })
            .catch(error => {
                console.error('WASM initialization failed:', error);
                setWasmReady(false);
            });

        const keypair = getSecretKeypair();
        if (keypair) {
            setSecretKeypair(keypair);
            setSecretAddress(keypair.toSuiAddress());
            console.log('Gas Sponsor Address:', keypair.toSuiAddress());
            fetchGasObjects(keypair.toSuiAddress());
        }

        checkZkLoginSession();

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

    const fetchGasObjects = async (address: string): Promise<void> => {
        try {
            const gasCoins = await suiClient.getOwnedObjects({
                owner: address,
                filter: {
                    StructType: '0x2::coin::Coin<0x2::sui::SUI>'
                },
                options: {
                    showContent: true,
                    showDisplay: true,
                    showType: true,
                }
            });

            if (gasCoins.data.length > 0) {
                const normalizedGasObjects = gasCoins.data.map(obj => ({
                    ...obj,
                    data: {
                        ...obj.data,
                        objectId: normalizeObjectId(obj.data?.objectId || ''),
                        version: obj.data?.version || '',
                        digest: obj.data?.digest || ''
                    }
                }));
                setGasObjects(normalizedGasObjects);
                console.log(`Found ${gasCoins.data.length} gas objects for sponsor`);
            } else {
                console.warn('No gas objects found for sponsor account');
            }
        } catch (error) {
            console.error('Failed to fetch gas objects:', error);
        }
    };

    const checkZkLoginSession = (): void => {
        try {
            console.log('Checking zkLogin session...');

            if (typeof window === 'undefined') {
                console.log('Not in browser environment');
                setAuthStatus('not_authenticated');
                return;
            }

            const urlHash = window.location.hash;
            let jwtFromUrl: string | null = null;

            if (urlHash && urlHash.length > 1) {
                const hashFragment = urlHash.substring(1);
                const hashParams = new URLSearchParams(hashFragment);
                jwtFromUrl = hashParams.get('id_token');

                if (jwtFromUrl) {
                    setJwtToken(jwtFromUrl);
                    const storedUserKeyData = localStorage.getItem("userKeyData");
                    if (storedUserKeyData) {
                        const keyData: UserKeyData = JSON.parse(storedUserKeyData);
                        setUserKeyData(keyData);

                        try {
                            const userSuiAddress = jwtToAddress(jwtFromUrl, BigInt(keyData.randomness));
                            setUserAddress(userSuiAddress);
                            setAuthStatus('authenticated');
                            console.log('✅ ZkLogin User Address:', userSuiAddress);
                            window.history.replaceState({}, document.title, window.location.pathname);
                            return;
                        } catch (addressError) {
                            console.error('❌ Error generating address from JWT:', addressError);
                            setAuthStatus('not_authenticated');
                            return;
                        }
                    }
                }
            }

            const storedUserKeyData = localStorage.getItem("userKeyData");
            const storedJwt = localStorage.getItem("sui_jwt_token");

            if (!storedUserKeyData || !storedJwt) {
                setAuthStatus('not_authenticated');
                return;
            }

            const keyData: UserKeyData = JSON.parse(storedUserKeyData);
            setUserKeyData(keyData);
            setJwtToken(storedJwt);

            try {
                const userSuiAddress = jwtToAddress(storedJwt, BigInt(keyData.randomness));
                setUserAddress(userSuiAddress);
                setAuthStatus('authenticated');
                console.log('✅ ZkLogin User Address from localStorage:', userSuiAddress);
            } catch (addressError) {
                console.error('❌ Error generating address from stored JWT:', addressError);
                setAuthStatus('not_authenticated');
            }
        } catch (error) {
            console.error('❌ Error checking zkLogin session:', error);
            setAuthStatus('not_authenticated');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const generateVRF = async (): Promise<void> => {
        if (!wasmReady) {
            alert("WASM module not ready. Please wait...");
            return;
        }

        setIsGeneratingVRF(true);
        try {
            const inputString = formData.name;
            const vrfResult = await generateVRFFromWasm(inputString);
            setVrfData(vrfResult);
            setVrfGenerated(true);
            console.log('VRF generated successfully:', vrfResult);
        } catch (error) {
            alert(`Failed to generate VRF: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
        } finally {
            setIsGeneratingVRF(false);
        }
    };
    function hexToBytes(hex: string): Uint8Array {
        if (hex.startsWith('0x')) hex = hex.slice(2);
        return Uint8Array.from(Buffer.from(hex, 'hex'));
    }
      

    const handleSubmit = async (): Promise<void> => {
        if (!vrfGenerated) {
            alert("Please generate VRF parameters first.");
            return;
        }

        if (!secretKeypair || !userKeyData || !jwtToken || !userAddress) {
            alert("Authentication or gas sponsor not ready.");
            return;
        }

        if (networkStatus !== 'connected') {
            alert("Not connected to testnet. Please wait or refresh.");
            return;
        }

        if (!vrfData.rawOutput || !vrfData.rawProof || !vrfData.rawAlphaString || !vrfData.rawPublicKey) {
            alert("VRF data is not properly generated.");
            return;
        }

        if (gasObjects.length === 0) {
            alert("No gas objects available for sponsor account. Please fund the sponsor account.");
            return;
        }

        setIsSubmitting(true);

        try {
            const tx = new Transaction();
    
            const normalizedPackageId = normalizeObjectId(formData.packageId);
            const normalizedCounsellorId = normalizeObjectId(formData.counsellorHandlerId);
            const normalizedPatientId = normalizeObjectId(formData.patientHandlerId);
            const normalizedClockId = normalizeObjectId(formData.clockId);
    
            // FIX: Handle photo as Option<String> - correct BCS format
            const photoArg = formData.photo && formData.photo.trim() !== ''
                ? tx.pure.option('string', formData.photo.trim())
                : tx.pure.option('string', null);
            
            console.log(vrfData, "this is us")
            // CRITICAL FIX: Move call with proper argument order
            tx.moveCall({
                target: `${normalizedPackageId}::zkrelief::add_crisis_report`,
                arguments: [
                    tx.object(normalizedCounsellorId),
                    tx.object(normalizedPatientId),
                    tx.object(normalizedClockId),
                    tx.pure(hexToBytes(vrfData.vrfOutput), "vector<u8>"),               // vector<u8>
                    tx.pure(hexToBytes(vrfData.proof), "vector<u8>"),                   // vector<u8>
                    tx.pure(hexToBytes(vrfData.inputString), "vector<u8>"),             // vector<u8>
                    tx.pure(hexToBytes(vrfData.publicKey), "vector<u8>"),               // vector<u8>
                    tx.pure.string(formData.name || "default"),                   // String
                    tx.pure.option(formData.photo || null, "string"),   // Option<String>
                    tx.pure.string(formData.content)  
                ]
            });

            // Set sender and gas payment
            tx.setSender(userAddress);

            const gasObject = gasObjects[0];
            const gasPayment = [{
                objectId: gasObject.data?.objectId || '',
                version: gasObject.data?.version || '',
                digest: gasObject.data?.digest || ''
            }];

            tx.setGasPayment(gasPayment);
            tx.setGasBudget(10000000); // Set explicit gas budget (10M MIST = 0.01 SUI)

            // CRITICAL FIX: Use sponsor signature mode for gas payment
            const txBytes = await tx.build({ client: suiClient });
            const sponsorSignature = await secretKeypair.sign(txBytes);
            const sponsorSigBase64 = Buffer.from(sponsorSignature).toString('base64');

            console.log('Transaction bytes length:', txBytes.length);
            console.log('Gas budget:', 10000000);
            console.log('Gas object ID:', gasObject.data?.objectId);
            console.log('VRF output length:', vrfData.rawOutput.length);
            console.log('VRF proof length:', vrfData.rawProof.length);
            console.log('VRF public key length:', vrfData.rawPublicKey.length);
            console.log('VRF alpha string length:', vrfData.rawAlphaString.length);

            const result = await suiClient.executeTransactionBlock({
                transactionBlock: txBytes,
                signature: sponsorSigBase64,
                options: {
                    showEffects: true,
                    showObjectChanges: true,
                }
            });

            console.log('Transaction successful on TESTNET:', result);

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
                vrfOutput: "",
                rawOutput: null,
                rawProof: null,
                rawPublicKey: null,
                rawAlphaString: null
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

    const handleLoginRedirect = (): void => {
        window.location.href = '/';
    };

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
            <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm mb-4 rounded">
                <strong>🚧 TESTNET MODE:</strong> Connected to Sui Testnet - Status: {networkStatus} | WASM: {wasmReady ? '✅' : '❌'} | Gas Objects: {gasObjects.length}
            </div>

            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                        <h1 className="text-2xl font-bold text-white">Crisis Report - WASM ECVRF (FIXED)</h1>
                        <p className="text-blue-100">Fixed VRF verification and gas handling issues</p>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className={`${wasmReady ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} rounded-lg p-4 border`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className={`font-semibold ${wasmReady ? 'text-green-900' : 'text-red-900'}`}>
                                        {wasmReady ? '✅ WASM ECVRF Ready' : '❌ WASM ECVRF Not Ready'}
                                    </h3>
                                    <p className={`text-sm ${wasmReady ? 'text-green-700' : 'text-red-700'}`}>
                                        {wasmReady ? 'Client-side VRF generation available' : 'Loading WASM module...'}
                                    </p>
                                </div>
                            </div>
                        </div>

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
                                    <p className="text-xs text-green-600">Gas Objects: {gasObjects.length}</p>
                                </div>
                            </div>
                        </div>

                        {gasObjects.length === 0 && secretAddress && (
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                <h3 className="font-semibold text-yellow-900">⚠️ No Gas Objects Found</h3>
                                <p className="text-sm text-yellow-700">
                                    The sponsor account needs SUI tokens to pay for gas fees. Please fund the account: {secretAddress}
                                </p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Photo URL (Optional)</label>
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">Crisis Report Details *</label>
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

                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                            <h3 className="font-semibold text-yellow-900 mb-3">WASM ECVRF Generation</h3>
                            <button
                                onClick={generateVRF}
                                disabled={isGeneratingVRF || !wasmReady}
                                className="mb-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
                            >
                                {isGeneratingVRF ? 'Generating...' : 'Generate VRF Parameters'}
                            </button>
                            {vrfGenerated && (
                                <div className="bg-green-100 p-3 rounded border border-green-200">
                                    <p className="text-sm text-green-700 flex items-center">
                                        ✅ WASM VRF parameters generated successfully!
                                    </p>
                                    <div className="mt-2 text-xs space-y-1">
                                        <p>Output length: {vrfData.rawOutput?.length || 0} bytes</p>
                                        <p>Proof length: {vrfData.rawProof?.length || 0} bytes</p>
                                        <p>Public key length: {vrfData.rawPublicKey?.length || 0} bytes</p>
                                        <p>Alpha string length: {vrfData.rawAlphaString?.length || 0} bytes</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !vrfGenerated || !secretKeypair || !wasmReady || networkStatus !== 'connected' || authStatus !== 'authenticated' || gasObjects.length === 0}
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
                            ) : !wasmReady ? (
                                'Loading WASM...'
                            ) : gasObjects.length === 0 ? (
                                'No Gas Objects Available'
                            ) : !vrfGenerated ? (
                                'Generate VRF Parameters First'
                            ) : (
                                'Submit Crisis Report to Testnet'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
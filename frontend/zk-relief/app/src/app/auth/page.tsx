"use client";

import {useEffect, useLayoutEffect, useState} from "react";
import {useRouter} from "next/navigation";
import jwt_decode from "jwt-decode";
import {GetSaltRequest, LoginResponse, UserKeyData, ZKPPayload, ZKPRequest} from "@/app/types/UsefulTypes";

import {genAddressSeed, getZkLoginSignature, jwtToAddress} from '@mysten/zklogin';
import axios from "axios";
import {toBigIntBE} from "bigint-buffer";
import {fromB64} from "@mysten/bcs";
import {useSui} from "@/app/hooks/useSui";
import {SerializedSignature} from "@mysten/sui.js/cryptography";
import {Ed25519Keypair} from "@mysten/sui.js/keypairs/ed25519";
import {TransactionBlock} from '@mysten/sui.js/transactions';
import {Blocks} from 'react-loader-spinner'
import {toast} from "react-hot-toast";
import { ZkLoginSignatureInputs} from "@mysten/sui.js/dist/cjs/zklogin/bcs";

export default function Page() {
    const router = useRouter();
    
    const [error, setError] = useState<string | null>(null);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [txDigest, setTxDigest] = useState<string | null>(null);
    const [jwtEncoded, setJwtEncoded] = useState<string | null>(null);
    const [userAddress, setUserAddress] = useState<string | null>(null);
    const [subjectID, setSubjectID] = useState<string | null>(null);
    const [zkProof, setZkProof] = useState<ZkLoginSignatureInputs | null>(null);
    const [userSalt, setUserSalt] = useState<string | null>(null);
    const [userBalance, setUserBalance] = useState<number>(0);
    const [transactionInProgress, setTransactionInProgress] = useState<boolean>(false);

    const {suiClient} = useSui();

    const MINIMUM_BALANCE = 0.003;

    // Navigation functions
    const handleSubmitReport = () => {
        router.push('/submit-report');
    };

    const handleAllCounsellors = () => {
        router.push('/all-counsellors');
    };

    async function getSalt(subject: string, jwtEncoded: string) {
        const getSaltRequest: GetSaltRequest = {
            subject: subject,
            jwt: jwtEncoded!
        }
        console.log("Getting salt...");
        console.log("Subject = ", subject);
        console.log("jwt = ", jwtEncoded);
        const response = await axios.post('/api/userinfo/get/salt', getSaltRequest);
        console.log("getSalt response = ", response);
        if (response?.data.status == 200) {
            const userSalt = response.data.salt;
            console.log("Salt fetched! Salt = ", userSalt);
            return userSalt;
        } else {
            console.log("Error Getting SALT");
            return null;
        }
    }
    

    function printUsefulInfo(decodedJwt: LoginResponse, userKeyData: UserKeyData) {
        console.log("iat  = " + decodedJwt.iat);
        console.log("iss  = " + decodedJwt.iss);
        console.log("sub = " + decodedJwt.sub);
        console.log("aud = " + decodedJwt.aud);
        console.log("exp = " + decodedJwt.exp);
        console.log("nonce = " + decodedJwt.nonce);
        console.log("ephemeralPublicKey b64 =", userKeyData.ephemeralPublicKey);
    }

    async function executeTransactionWithZKP() {
        setError(null);
        setTransactionInProgress(true);
        const decodedJwt: LoginResponse = jwt_decode(jwtEncoded!) as LoginResponse;
        const {userKeyData, ephemeralKeyPair} = getEphemeralKeyPair();
        const partialZkSignature = zkProof!;

        if (!partialZkSignature || !ephemeralKeyPair || !userKeyData) {
            createRuntimeError("Transaction cannot proceed. Missing critical data.");
            return;
        }

        const txb = new TransactionBlock();

        //Just a simple Demo call to create a little NFT weapon :p
        txb.moveCall({
            target: `0xf8294cd69d69d867c5a187a60e7095711ba237fad6718ea371bf4fbafbc5bb4b::teotest::create_weapon`,  //demo package published on testnet
            arguments: [
                txb.pure("Zero Knowledge Proof Axe 9000"),  // weapon name
                txb.pure(66),  // weapon damage
            ],
        });
        txb.setSender(userAddress!);

        const signatureWithBytes = await txb.sign({client: suiClient, signer: ephemeralKeyPair});

        console.log("Got SignatureWithBytes = ", signatureWithBytes);
        console.log("maxEpoch = ", userKeyData.maxEpoch);
        console.log("userSignature = ", signatureWithBytes.signature);

        const addressSeed = genAddressSeed(BigInt(userSalt!), "sub", decodedJwt.sub, decodedJwt.aud);

        const zkSignature: SerializedSignature = getZkLoginSignature({
            inputs: {
                ...partialZkSignature,
                addressSeed: addressSeed.toString(),
            },
            maxEpoch: userKeyData.maxEpoch,
            userSignature: signatureWithBytes.signature,
        });

        suiClient.executeTransactionBlock({
            transactionBlock: signatureWithBytes.bytes,
            signature: zkSignature,
            options: {
                showEffects: true
            }
        }).then((response) => {
            if (response.effects?.status.status == "success") {
                console.log("Transaction executed! Digest = ", response.digest);
                setTxDigest(response.digest);
                setTransactionInProgress(false);
            } else {
                console.log("Transaction failed! reason = ", response.effects?.status)
                setTransactionInProgress(false);
            }
        }).catch((error) => {
            console.log("Error During Tx Execution. Details: ", error);
            if(error.toString().includes("Signature is not valid")){
                createRuntimeError("Signature is not valid. Please generate a new one by clicking on 'Get new ZK Proof'");
            }
            setTransactionInProgress(false);
        });
    }

    async function getZkProof(forceUpdate = false) {
        setError(null);
        setTransactionInProgress(true);
        const decodedJwt: LoginResponse = jwt_decode(jwtEncoded!) as LoginResponse;
        const {userKeyData, ephemeralKeyPair} = getEphemeralKeyPair();

        printUsefulInfo(decodedJwt, userKeyData);

        const ephemeralPublicKeyArray: Uint8Array = fromB64(userKeyData.ephemeralPublicKey);

        const zkpPayload: ZKPPayload =
            {
                jwt: jwtEncoded!,
                extendedEphemeralPublicKey: toBigIntBE(
                    Buffer.from(ephemeralPublicKeyArray),
                ).toString(),
                jwtRandomness: userKeyData.randomness,
                maxEpoch: userKeyData.maxEpoch,
                salt: userSalt!,
                keyClaimName: "sub"
            };
        const ZKPRequest: ZKPRequest = {
            zkpPayload,
            forceUpdate
        }
        console.log("about to post zkpPayload = ", ZKPRequest);
        setPublicKey(zkpPayload.extendedEphemeralPublicKey);

        //Invoking our custom backend to delagate Proof Request to Mysten backend.
        // Delegation was done to avoid CORS errors.
        const proofResponse = await axios.post('/api/zkp/get', ZKPRequest);

        if (!proofResponse?.data?.zkp) {
            createRuntimeError("Error getting Zero Knowledge Proof. Please check that Prover Service is running.");
            return;
        }
        console.log("zkp response = ", proofResponse.data.zkp);

        setZkProof((proofResponse.data.zkp as ZkLoginSignatureInputs));

        setTransactionInProgress(false);
    }

    function getEphemeralKeyPair() {
        const userKeyData: UserKeyData = JSON.parse(localStorage.getItem("userKeyData")!);
        let ephemeralKeyPairArray = Uint8Array.from(Array.from(fromB64(userKeyData.ephemeralPrivateKey!)));
        const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(ephemeralKeyPairArray);
        return {userKeyData, ephemeralKeyPair};
    }

    async function checkIfAddressHasBalance(address: string): Promise<boolean> {
        console.log("Checking whether address " + address + " has balance...");
        const coins = await suiClient.getCoins({
            owner: address,
        });
        //loop over coins
        let totalBalance = 0;
        for (const coin of coins.data) {
            totalBalance += parseInt(coin.balance);
        }
        totalBalance = totalBalance / 1000000000;  //Converting MIST to SUI
        setUserBalance(totalBalance);
        console.log("total balance = ", totalBalance);
        return enoughBalance(totalBalance);
    }

    function enoughBalance(userBalance: number) {
        return userBalance > MINIMUM_BALANCE;
    }

    //** This is just for testing purposes. DO NOT USE IN PRODUCTION */
    function getTestnetAdminSecretKey() {
        return process.env.NEXT_PUBLIC_ADMIN_SECRET_KEY;
    }

    async function giveSomeTestCoins(address: string) {
        setError(null);
        console.log("Giving some test coins to address " + address);
        setTransactionInProgress(true);
        const adminPrivateKey = getTestnetAdminSecretKey();
        if (!adminPrivateKey) {
            createRuntimeError("Admin Secret Key not found. Please set NEXT_PUBLIC_ADMIN_SECRET_KEY environment variable.");
            return
        }
        let adminPrivateKeyArray = Uint8Array.from(Array.from(fromB64(adminPrivateKey)));
        const adminKeypair = Ed25519Keypair.fromSecretKey(adminPrivateKeyArray.slice(1));
        const tx = new TransactionBlock();
        const giftCoin = tx.splitCoins(tx.gas, [tx.pure(30000000)]);

        tx.transferObjects([giftCoin], tx.pure(address));

        const res = await suiClient.signAndExecuteTransactionBlock({
            transactionBlock: tx,
            signer: adminKeypair,
            requestType: "WaitForLocalExecution",
            options: {
                showEffects: true,
            },
        });
        const status = res?.effects?.status?.status;
        if (status === "success") {
            console.log("Gift Coin transfer executed! status = ", status);
            checkIfAddressHasBalance(address);
            setTransactionInProgress(false);
        }
        if (status == "failure") {
            createRuntimeError("Gift Coin transfer Failed. Error = " + res?.effects);
        }
    }

    async function loadRequiredData(encodedJwt: string) {
        //Decoding JWT to get useful Info
        localStorage.setItem("sui_jwt_token", encodedJwt);
    console.log("JWT token stored in localStorage");
        const decodedJwt: LoginResponse = await jwt_decode(encodedJwt!) as LoginResponse;

        setSubjectID(decodedJwt.sub);
        //Getting Salt
        const userSalt = await getSalt(decodedJwt.sub, encodedJwt);
        if (!userSalt) {
            createRuntimeError("Error getting userSalt");
            return;
        }

        //Generating User Address
        const address = jwtToAddress(encodedJwt!, BigInt(userSalt!));

        setUserAddress(address);
        setUserSalt(userSalt!);
        const hasEnoughBalance = await checkIfAddressHasBalance(address);
        if(!hasEnoughBalance){
            await giveSomeTestCoins(address);
            toast.success("We' ve fetched some coins for you, so you can get started with Sui !", {   duration: 8000,} );
        }

        console.log("All required data loaded. ZK Address =", address);
    }

    useLayoutEffect(() => {
        setError(null);
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const jwt_token_encoded = hash.get("id_token");

        const userKeyData: UserKeyData = JSON.parse(localStorage.getItem("userKeyData")!);

        if (!jwt_token_encoded) {
            createRuntimeError("Could not retrieve a valid JWT Token!")
            return;
        }

        if (!userKeyData) {
            createRuntimeError("user Data is null");
            return;
        }

        setJwtEncoded(jwt_token_encoded);

        loadRequiredData(jwt_token_encoded);

    }, []);

    useEffect(() => {
        if (jwtEncoded && userSalt) {
            console.log("jwtEncoded is defined. Getting ZK Proof...");
            getZkProof();
        }
    }, [jwtEncoded, userSalt]);

    function createRuntimeError(message: string) {
        setError(message);
        console.log(message);
        setTransactionInProgress(false);
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-sm text-gray-500">Welcome back!</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Main Action Buttons */}
                <div className="mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleSubmitReport}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-purple-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                            <div className="relative z-10">
                                <div className="mb-4">
                                    <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2">Submit Report</h3>
                                <p className="text-blue-100">File a new report or complaint</p>
                            </div>
                        </button>

                        <button
                            onClick={handleAllCounsellors}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-emerald-700 to-teal-700 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
                            <div className="relative z-10">
                                <div className="mb-4">
                                    <svg className="h-12 w-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold mb-2">All Counsellors</h3>
                                <p className="text-emerald-100">Browse available counsellors</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* User Details Card */}
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6">
                        <h2 className="text-2xl font-bold text-white">Account Details</h2>
                        <p className="text-indigo-100 mt-1">Your blockchain identity information</p>
                    </div>

                    <div className="p-8">
                        <div className="space-y-6">
                            {userAddress && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-900 mb-1">User Address</dt>
                                        <dd className="text-sm text-gray-600 font-mono break-all">{userAddress}</dd>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(userAddress)}
                                        className="mt-3 sm:mt-0 sm:ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                        Copy
                                    </button>
                                </div>
                            )}

                            {userAddress && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-900 mb-1">Balance</dt>
                                        <dd className="text-sm text-gray-600">{userBalance.toFixed(4)} SUI</dd>
                                    </div>
                                    <button
                                        onClick={() => giveSomeTestCoins(userAddress)}
                                        disabled={!userAddress}
                                        className="mt-3 sm:mt-0 sm:ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Get Testnet Coins
                                    </button>
                                </div>
                            )}

                            {userSalt && (
                                <>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <dt className="text-sm font-medium text-gray-900 mb-1">User Salt</dt>
                                        <dd className="text-sm text-gray-600 font-mono break-all">{userSalt}</dd>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <dt className="text-sm font-medium text-gray-900 mb-1">Subject ID</dt>
                                        <dd className="text-sm text-gray-600 font-mono break-all">{subjectID}</dd>
                                    </div>
                                </>
                            )}

                            {zkProof && (
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-900 mb-1">ZK Proof (point A)</dt>
                                        <dd className="text-sm text-gray-600 font-mono break-all">
                                            {zkProof?.proofPoints?.a.toString().slice(0, 30)}...
                                        </dd>
                                    </div>
                                    <button
                                        onClick={() => getZkProof(true)}
                                        className="mt-3 sm:mt-0 sm:ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                    >
                                        Get new ZK Proof
                                    </button>
                                </div>
                            )}
                        </div>

                        {zkProof && enoughBalance(userBalance) && (
                            <div className="mt-8">
                                <button
                                    onClick={executeTransactionWithZKP}
                                    disabled={!userAddress}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    Execute Transaction
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Transaction Success */}
                {txDigest && (
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-8">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
                            <h3 className="text-2xl font-bold text-white">Transaction Completed!</h3>
                        </div>
                        <div className="p-8 text-center">
                            <div className="mb-6">
                                <p className="text-sm text-gray-600 mb-2">Transaction Digest:</p>
                                <p className="font-mono text-sm bg-gray-100 p-3 rounded-lg break-all">{txDigest}</p>
                            </div>
                            <button
                                onClick={() => window.open(`https://testnet.suivision.xyz/txblock/${txDigest}`, "_blank")}
                                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                            >
                                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View on Explorer
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading */}
                {transactionInProgress && (
                    <div className="flex justify-center items-center py-12">
                        <div className="bg-white rounded-2xl shadow-xl p-8">
                            <div className="flex flex-col items-center">
                                <Blocks
                                    visible={true}
                                    height="80"
                                    width="80"
                                    ariaLabel="blocks-loading"
                                    wrapperStyle={{}}
                                    wrapperClass="blocks-wrapper"
                                />
                                <p className="mt-4 text-gray-600">Processing transaction...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Error</h3>
                                <p className="mt-1 text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
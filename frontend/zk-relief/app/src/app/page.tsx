        "use client";

        declare global {
            interface Window {
                userKeyData?: import("@/app/types/UsefulTypes").UserKeyData;
            }
        }

        import { generateNonce, generateRandomness } from '@mysten/zklogin';
        import { useSui } from "@/app/hooks/useSui";
        import { useLayoutEffect, useState, useRef, useEffect } from "react";
        import { UserKeyData } from "@/app/types/UsefulTypes";
        import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
        import { Keypair, PublicKey } from "@mysten/sui.js/cryptography";
        import { Shield, Heart, Lock, Users, Eye, EyeOff } from 'lucide-react';

        export default function Home() {
            const { suiClient } = useSui();
            const [loginUrl, setLoginUrl] = useState<string | null>();
            const [isLoading, setIsLoading] = useState(false);
            const [showFeatures, setShowFeatures] = useState(false);
            const canvasRef = useRef<HTMLCanvasElement>(null);
            const animationRef = useRef<number>();

            // 3D Background Animation
            useEffect(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const resizeCanvas = () => {
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                };

                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);

                // Particle system for 3D-like floating elements
                const particles: Array<{
                    x: number;
                    y: number;
                    z: number;
                    vx: number;
                    vy: number;
                    vz: number;
                    size: number;
                    opacity: number;
                    color: string;
                }> = [];

                // Initialize particles
                for (let i = 0; i < 50; i++) {
                    particles.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * canvas.height,
                        z: Math.random() * 100,
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        vz: (Math.random() - 0.5) * 0.2,
                        size: Math.random() * 3 + 1,
                        opacity: Math.random() * 0.5 + 0.1,
                        color: ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B'][Math.floor(Math.random() * 4)]
                    });
                }

                const animate = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Create gradient background
                    const gradient = ctx.createRadialGradient(
                        canvas.width / 2, canvas.height / 2, 0,
                        canvas.width / 2, canvas.height / 2, canvas.width
                    );
                    gradient.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
                    gradient.addColorStop(1, 'rgba(2, 6, 23, 1)');
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // Update and draw particles
                    particles.forEach((particle, index) => {
                        particle.x += particle.vx;
                        particle.y += particle.vy;
                        particle.z += particle.vz;

                        // Wrap around edges
                        if (particle.x < 0) particle.x = canvas.width;
                        if (particle.x > canvas.width) particle.x = 0;
                        if (particle.y < 0) particle.y = canvas.height;
                        if (particle.y > canvas.height) particle.y = 0;

                        // 3D effect based on z position
                        const scale = Math.max(0.1, (100 - particle.z) / 100);
                        const size = Math.max(0.5, particle.size * scale);
                        const opacity = Math.max(0.01, particle.opacity * scale);

                        ctx.globalAlpha = opacity;
                        ctx.fillStyle = particle.color;
                        ctx.beginPath();
                        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
                        ctx.fill();

                        // Draw connections between nearby particles
                        particles.slice(index + 1).forEach(otherParticle => {
                            const dx = particle.x - otherParticle.x;
                            const dy = particle.y - otherParticle.y;
                            const distance = Math.sqrt(dx * dx + dy * dy);

                            if (distance < 100 && distance > 0) {
                                ctx.globalAlpha = Math.max(0.01, (1 - distance / 100) * 0.1);
                                ctx.strokeStyle = particle.color;
                                ctx.lineWidth = 1;
                                ctx.beginPath();
                                ctx.moveTo(particle.x, particle.y);
                                ctx.lineTo(otherParticle.x, otherParticle.y);
                                ctx.stroke();
                            }
                        });
                    });

                    ctx.globalAlpha = 1;
                    animationRef.current = requestAnimationFrame(animate);
                };

                animate();

                return () => {
                    window.removeEventListener('resize', resizeCanvas);
                    if (animationRef.current) {
                        cancelAnimationFrame(animationRef.current);
                    }
                };
            }, []);

            async function prepareLogin() {
                setIsLoading(true);
                try {
                    const { epoch, epochDurationMs, epochStartTimestampMs } = await suiClient.getLatestSuiSystemState();

                    const maxEpoch = parseInt(epoch) + 2;
                    const ephemeralKeyPair: Keypair = new Ed25519Keypair();
                    const ephemeralPrivateKeyB64 = ephemeralKeyPair.export().privateKey;

                    const ephemeralPublicKey: PublicKey = ephemeralKeyPair.getPublicKey()
                    const ephemeralPublicKeyB64 = ephemeralPublicKey.toBase64();

                    const jwt_randomness = generateRandomness();
                    const nonce = generateNonce(ephemeralPublicKey as unknown as import("@mysten/zklogin/node_modules/@mysten/sui/dist/cjs/cryptography/publickey").PublicKey, maxEpoch, jwt_randomness);

                    console.log("current epoch = " + epoch);
                    console.log("maxEpoch = " + maxEpoch);
                    console.log("jwt_randomness = " + jwt_randomness);
                    console.log("ephemeral public key = " + ephemeralPublicKeyB64);
                    console.log("nonce = " + nonce);

                    const userKeyData: UserKeyData = {
                        randomness: jwt_randomness.toString(),
                        nonce: nonce,
                        ephemeralPublicKey: ephemeralPublicKeyB64,
                        ephemeralPrivateKey: ephemeralPrivateKeyB64,
                        maxEpoch: maxEpoch
                    }

                    // Store in localStorage like the original working version
                    localStorage.setItem("userKeyData", JSON.stringify(userKeyData));
                    
                    // Also store in window for immediate access if needed
                    window.userKeyData = userKeyData;
                    
                    return userKeyData;
                } catch (error) {
                    console.error('Error preparing login:', error);
                    throw error;
                } finally {
                    setIsLoading(false);
                }
            }

            function getRedirectUri() {
                const protocol = window.location.protocol;
                const host = window.location.host;
                const customRedirectUri = protocol + "//" + host + "/auth";
                console.log("customRedirectUri = " + customRedirectUri);
                return customRedirectUri;
            }

            useLayoutEffect(() => {
                prepareLogin().then((userKeyData) => {
                    const REDIRECT_URI = 'https://zklogin-dev-redirect.vercel.app/api/auth';
                    const customRedirectUri = getRedirectUri();
                    const params = new URLSearchParams({
                        state: new URLSearchParams({
                            redirect_uri: customRedirectUri
                        }).toString(),
                        client_id: '595966210064-3nnnqvmaelqnqsmq448kv05po362smt2.apps.googleusercontent.com',
                        redirect_uri: REDIRECT_URI,
                        response_type: 'id_token',
                        scope: 'openid',
                        nonce: userKeyData.nonce,
                    });

                    setLoginUrl(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
                }).catch((error) => {
                    console.error('Error preparing login:', error);
                    setIsLoading(false);
                });

                // Auto-show features after a delay
                const timer = setTimeout(() => setShowFeatures(true), 1000);
                return () => clearTimeout(timer);
            }, []);

            const features = [
                {
                    icon: <Shield className="w-8 h-8" />,
                    title: "Zero-Knowledge Privacy",
                    description: "Your identity remains completely anonymous through advanced cryptographic proofs"
                },
                {
                    icon: <Heart className="w-8 h-8" />,
                    title: "Peer Support Matching",
                    description: "Connect with verified counselors and survivors through our fair matching system"
                },
                {
                    icon: <Lock className="w-8 h-8" />,
                    title: "Trustless Security",
                    description: "No central authority can access your data or compromise your privacy"
                },
                {
                    icon: <Users className="w-8 h-8" />,
                    title: "Safe Community",
                    description: "Find support without fear of stigma, retaliation, or judgment"
                }
            ];

            return (
                <div className="min-h-screen relative overflow-hidden">
                    {/* 3D Background Canvas */}
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full"
                        style={{ zIndex: 1 }}
                    />

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-cyan-900/20" style={{ zIndex: 2 }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" style={{ zIndex: 2 }} />

                    {/* Main Content */}
                    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ zIndex: 3 }}>
                        
                        {/* Header Section */}
                        <div className="text-center mb-12 max-w-4xl mx-auto">
                            <div className="mb-6 relative">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-3xl mb-6 shadow-2xl animate-pulse">
                                    <Shield className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse" />
                            </div>
                            
                            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent mb-6 leading-tight">
                                ZKRelief
                            </h1>
                            
                            <div className="space-y-4 mb-8">
                                <p className="text-xl md:text-2xl text-gray-300 font-light">
                                    A trustless, anonymous support-matching platform
                                </p>
                                <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                                    For survivors of rape and abuse — powered by zkLogin and ECVRF
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-8">
                                <Lock className="w-4 h-4" />
                                <span>End-to-end encrypted</span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                                <Eye className="w-4 h-4" />
                                <span>Anonymous by design</span>
                                <span className="w-1 h-1 bg-gray-500 rounded-full" />
                                <Shield className="w-4 h-4" />
                                <span>Zero-knowledge proofs</span>
                            </div>
                        </div>

                        {/* Login Section */}
                        <div className="mb-16">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl max-w-md mx-auto">
                                <div className="text-center mb-6">
                                    <h2 className="text-2xl font-bold text-white mb-2">Enter Safely</h2>
                                    <p className="text-gray-400 text-sm">Your journey to support begins here</p>
                                </div>

                                <a 
                                    href={loginUrl || '#'} 
                                    className={`block w-full ${!loginUrl ? 'pointer-events-none' : ''}`}
                                    target="_blank"
                                >
                                    <button
                                        disabled={!loginUrl || isLoading}
                                        className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:scale-100 disabled:shadow-none flex items-center justify-center space-x-3 group"
                                    >
                                        {isLoading ? (
                                            <>
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Preparing secure login...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="24" height="24" viewBox="0 0 48 48" className="group-hover:scale-110 transition-transform">
                                                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                                                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                                                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                                                </svg>
                                                <span>Continue with Google</span>
                                                <Shield className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </a>
                            </div>
                        </div>

                        {/* Features Section */}
                        <div className={`transition-all duration-1000 transform ${showFeatures ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'} max-w-6xl mx-auto`}>
                            <div className="text-center mb-12">
                                <h3 className="text-3xl font-bold text-white mb-4">Why ZKRelief?</h3>
                                <p className="text-gray-400 max-w-2xl mx-auto">
                                    Breaking the barriers that prevent survivors from seeking help through revolutionary privacy technology
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {features.map((feature, index) => (
                                    <div 
                                        key={index}
                                        className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl group"
                                        style={{
                                            animationDelay: `${index * 0.2}s`,
                                            animation: showFeatures ? 'slideInUp 0.6s ease-out forwards' : 'none'
                                        }}
                                    >
                                        <div className="text-purple-400 mb-4 group-hover:text-cyan-400 transition-colors duration-300">
                                            {feature.icon}
                                        </div>
                                        <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-200 transition-colors">
                                            {feature.title}
                                        </h4>
                                        <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors">
                                            {feature.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mission Statement */}
                        <div className="mt-16 max-w-4xl mx-auto text-center">
                            <div className="bg-gradient-to-r from-purple-900/20 to-cyan-900/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8">
                                <h4 className="text-2xl font-bold text-white mb-4">Our Mission</h4>
                                <p className="text-gray-300 leading-relaxed text-lg">
                                    Survivors deserve support without fear. ZKVoice creates a safe space where anonymity meets empowerment, 
                                    where trust is built through technology, not faith. No one should suffer alone.
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <footer className="mt-16 text-center">
                            <div className="flex items-center justify-center space-x-6 text-gray-500 text-sm">
                                <a 
                                    href="https://github.com/teohaik/poc-zklogin" 
                                    className="hover:text-purple-400 transition-colors duration-300 flex items-center space-x-2 group"
                                    target="_blank"
                                >
                                    <span></span>
                                    
                                </a>
                            </div>
                            <div className="mt-4 text-xs text-gray-600">
                                <p>Powered by Zero-Knowledge Cryptography & Verifiable Randomness</p>
                            </div>
                        </footer>
                    </div>

                    <style>{`
                        @keyframes slideInUp {
                            from {
                                opacity: 0;
                                transform: translateY(30px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }
                    `}</style>
                </div>
            );
        }
import {NextRequest, NextResponse} from "next/server";
import {kv} from "@vercel/kv";
import {LoginResponse, ZKPRequest} from "@/app/types/UsefulTypes";
import axios from "axios";
import jwtDecode from "jwt-decode"; // Updated import

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const zkpRequest = body as ZKPRequest;
        
        if(!zkpRequest || !zkpRequest.zkpPayload?.jwt) {
            return NextResponse.json({code: 422, message: "Wrong Body Format or missing JWT!"});
        }

        let decodedJwt: LoginResponse;
        try {
            decodedJwt = jwtDecode(zkpRequest.zkpPayload.jwt) as LoginResponse;
        } catch (jwtError) {
            console.error("JWT decode error:", jwtError);
            return NextResponse.json({code: 400, message: "Invalid JWT token"});
        }

        if (!decodedJwt.sub) {
            return NextResponse.json({code: 400, message: "JWT missing subject"});
        }

        console.log("Received request to get proof for subject = ", decodedJwt.sub, " Force Update = ", zkpRequest.forceUpdate);

        // Check if KV is available (might not be in development)
        let savedProof = null;
        try {
            savedProof = await kv.hget(decodedJwt.sub, "zkp");
        } catch (kvError) {
            console.warn("KV storage not available:", kvError);
            // Continue without cached proof
        }

        if (savedProof && !zkpRequest.forceUpdate) {
            console.log("ZK Proof found in database.");
            return NextResponse.json({code: 200, zkp: savedProof});
        }
        else {
            const proverResponse = await getZKPFromProver(zkpRequest.zkpPayload);

            if(proverResponse.status !== 200 || !proverResponse.data) {
                console.error("Prover service error:", proverResponse.status, proverResponse.statusText);
                return NextResponse.json({
                    code: proverResponse.status, 
                    message: `Prover service error: ${proverResponse.statusText}`
                });
            }

            const zkpProof = proverResponse.data;
            console.log("ZK Proof created from prover");

            // Store proof in database (with error handling)
            try {
                await storeProofInDatabase(zkpProof, decodedJwt.sub);
            } catch (storeError) {
                console.error("Failed to store proof in database:", storeError);
                // Continue anyway, as the proof was generated successfully
            }

            return NextResponse.json({code: 200, zkp: zkpProof});
        }
    } catch (error) {
        console.error("API route error:", error);
        return NextResponse.json({
            code: 500, 
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
}

async function getZKPFromProver(zkpPayload: any) {
    try {
        console.log("ZK Proof not found in database. Creating proof from prover...");
        const proverURL = process.env.NEXT_PUBLIC_PROVER_API || "https://prover.mystenlabs.com/v1";
        
        console.log("Making request to prover URL:", proverURL);
        console.log("Payload:", JSON.stringify(zkpPayload, null, 2));
        
        const response = await axios.post(proverURL, zkpPayload, {
            timeout: 30000, // 30 second timeout
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        return response;
    } catch (error) {
        console.error("Prover request failed:", error);
        
        if (axios.isAxiosError(error)) {
            return {
                status: error.response?.status || 500,
                statusText: error.response?.statusText || error.message,
                data: null
            };
        }
        
        return {
            status: 500,
            statusText: "Unknown prover error",
            data: null
        };
    }
}

async function storeProofInDatabase(zkpProof: string, subject: string) {
    try {
        await kv.hset(subject, { "zkp": zkpProof });
        console.log("Proof stored in database.");
    } catch (error) {
        console.error("Database storage error:", error);
        throw error;
    }
}
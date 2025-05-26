use wasm_bindgen::prelude::*;
use fastcrypto::vrf::ecvrf::{ECVRFKeyPair, ECVRFPrivateKey, ECVRFPublicKey, ECVRFProof};
use fastcrypto::vrf::{VRFKeyPair, VRFProof}; 
use rand::rngs::StdRng;
use rand::SeedableRng;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct WasmECVRFKeypair {
    sk: Vec<u8>,
    pk: Vec<u8>,
}

#[wasm_bindgen]
impl WasmECVRFKeypair {
    #[wasm_bindgen(constructor)]
    pub fn new(sk: Vec<u8>, pk: Vec<u8>) -> WasmECVRFKeypair {
        WasmECVRFKeypair { sk, pk }
    }

    #[wasm_bindgen(getter)]
    pub fn sk(&self) -> Vec<u8> {
        self.sk.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn pk(&self) -> Vec<u8> {
        self.pk.clone()
    }
}

#[wasm_bindgen]
pub fn generate_ecvrf_keypair() -> Result<WasmECVRFKeypair, JsValue> {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    let seed = js_sys::Math::random();
    let seed_bytes = (seed * (u64::MAX as f64)) as u64;
    let mut rng = StdRng::seed_from_u64(seed_bytes);
    
    let kp = ECVRFKeyPair::generate(&mut rng);
    
    let sk_bytes = bincode::serialize(&kp.sk)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize private key: {}", e)))?;
    
    let pk_bytes = bincode::serialize(&kp.pk)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize public key: {}", e)))?;
    
    Ok(WasmECVRFKeypair {
        sk: sk_bytes,
        pk: pk_bytes,
    })
}

#[wasm_bindgen]
pub fn ecvrf_prove(sk_bytes: &[u8], msg: &[u8]) -> Result<Vec<u8>, JsValue> {
    let sk: ECVRFPrivateKey = bincode::deserialize(sk_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize private key: {}", e)))?;
    
    let kp = ECVRFKeyPair::from(sk); // This reconstructs the keypair, deriving the public key.
    let proof_object = kp.prove(msg);
    
    let proof_bytes = bincode::serialize(&proof_object)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize proof: {}", e)))?;
    
    Ok(proof_bytes)
}

#[wasm_bindgen]
pub fn ecvrf_verify(pk_bytes: &[u8], msg: &[u8], proof_bytes: &[u8]) -> Result<bool, JsValue> {
    let pk: ECVRFPublicKey = bincode::deserialize(pk_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize public key: {}", e)))?;
    
    let proof: ECVRFProof = bincode::deserialize(proof_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize proof: {}", e)))?;
    
    // verify() returns Result<Output, Error> where Output is the hash if successful
    // The contract seems to take the hash as input, so this verifies the proof against msg and pk
    // and implicitly checks if the derived hash matches what would be proof.to_hash()
    Ok(proof.verify(msg, &pk).is_ok())
}

#[wasm_bindgen]
pub fn ecvrf_proof_to_hash(proof_bytes: &[u8]) -> Result<Vec<u8>, JsValue> {
    let proof: ECVRFProof = bincode::deserialize(proof_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize proof: {}", e)))?;
    
    Ok(proof.to_hash().to_vec())
}

#[wasm_bindgen]
pub struct WasmVRFContractParameters {
    output: Vec<u8>,     // VRF hash (gamma)
    proof: Vec<u8>,      // Serialized ECVRFProof
    public_key: Vec<u8>, // Serialized ECVRFPublicKey
}

#[wasm_bindgen]
impl WasmVRFContractParameters {
    #[wasm_bindgen(getter)]
    pub fn output(&self) -> Vec<u8> { self.output.clone() }

    #[wasm_bindgen(getter)]
    pub fn proof(&self) -> Vec<u8> { self.proof.clone() }

    #[wasm_bindgen(getter)]
    pub fn public_key(&self) -> Vec<u8> { self.public_key.clone() }
}

#[wasm_bindgen]
pub fn generate_vrf_params_for_contract(sk_bytes: &[u8], alpha_string: &[u8]) -> Result<WasmVRFContractParameters, JsValue> {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));

    // 1. Deserialize the private key
    let sk: ECVRFPrivateKey = bincode::deserialize(sk_bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to deserialize private key: {}", e)))?;
    
    // 2. Reconstruct the full keypair to get the public key and to prove
    let kp = ECVRFKeyPair::from(sk); // This derives the public key from the private key

    // 3. Generate the proof object
    // The input `alpha_string` is the message for the VRF
    let proof_obj: ECVRFProof = kp.prove(alpha_string);

    // 4. Get the VRF output (hash) from the proof object
    // This is the `output` needed by your contract
    let output_bytes = proof_obj.to_hash().to_vec();

    // 5. Serialize the proof object for transmission
    // This is the `proof` needed by your contract
    let serialized_proof_bytes = bincode::serialize(&proof_obj)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize proof: {}", e)))?;

    // 6. Serialize the public key
    // This is the `public_key` needed by your contract
    let serialized_public_key_bytes = bincode::serialize(&kp.pk)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize public key: {}", e)))?;

    Ok(WasmVRFContractParameters {
        output: output_bytes,
        proof: serialized_proof_bytes,
        public_key: serialized_public_key_bytes,
    })
}

#[wasm_bindgen]
pub fn generate_ecvrf_keypair_raw() -> Result<WasmECVRFKeypair, JsValue> {
    std::panic::set_hook(Box::new(console_error_panic_hook::hook));
    let seed = js_sys::Math::random();
    let seed_bytes = (seed * (u64::MAX as f64)) as u64;
    let mut rng = StdRng::seed_from_u64(seed_bytes);
    let _kp = ECVRFKeyPair::generate(&mut rng);
    let mut sk_bytes = vec![0u8; 32];
    for i in 0..32 { sk_bytes[i] = (js_sys::Math::random() * 256.0) as u8; }
    let mut pk_bytes = vec![0u8; 32];
    for i in 0..32 { pk_bytes[i] = (js_sys::Math::random() * 256.0) as u8; }
    Ok(WasmECVRFKeypair { sk: sk_bytes, pk: pk_bytes })
}

#[wasm_bindgen]
pub fn ecvrf_prove_with_raw_keys(sk_bytes: &[u8], msg: &[u8]) -> Result<Vec<u8>, JsValue> {
    if sk_bytes.len() != 32 { return Err(JsValue::from_str("Private key must be 32 bytes")); }
    let seed = js_sys::Math::random();
    let seed_bytes = (seed * (u64::MAX as f64)) as u64;
    let mut rng = StdRng::seed_from_u64(seed_bytes);
    let kp = ECVRFKeyPair::generate(&mut rng);
    let proof = kp.prove(msg);
    Ok(proof.to_hash().to_vec())
}
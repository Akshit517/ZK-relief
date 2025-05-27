/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_wasmecvrfkeypair_free: (a: number, b: number) => void;
export const wasmecvrfkeypair_new: (a: number, b: number, c: number, d: number) => number;
export const wasmecvrfkeypair_sk: (a: number) => [number, number];
export const wasmecvrfkeypair_pk: (a: number) => [number, number];
export const generate_ecvrf_keypair: () => [number, number, number];
export const ecvrf_prove: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const ecvrf_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
export const ecvrf_proof_to_hash: (a: number, b: number) => [number, number, number, number];
export const __wbg_wasmvrfcontractparameters_free: (a: number, b: number) => void;
export const wasmvrfcontractparameters_output: (a: number) => [number, number];
export const wasmvrfcontractparameters_proof: (a: number) => [number, number];
export const wasmvrfcontractparameters_public_key: (a: number) => [number, number];
export const generate_vrf_params_for_contract: (a: number, b: number, c: number, d: number) => [number, number, number];
export const generate_ecvrf_keypair_raw: () => [number, number, number];
export const ecvrf_prove_with_raw_keys: (a: number, b: number, c: number, d: number) => [number, number, number, number];
export const rustsecp256k1_v0_8_1_context_create: (a: number) => number;
export const rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
export const rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
export const rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_export_3: WebAssembly.Table;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;

/* tslint:disable */
/* eslint-disable */
export function generate_ecvrf_keypair(): WasmECVRFKeypair;
export function ecvrf_prove(sk_bytes: Uint8Array, msg: Uint8Array): Uint8Array;
export function ecvrf_verify(pk_bytes: Uint8Array, msg: Uint8Array, proof_bytes: Uint8Array): boolean;
export function ecvrf_proof_to_hash(proof_bytes: Uint8Array): Uint8Array;
export function generate_vrf_params_for_contract(sk_bytes: Uint8Array, alpha_string: Uint8Array): WasmVRFContractParameters;
export function generate_ecvrf_keypair_raw(): WasmECVRFKeypair;
export function ecvrf_prove_with_raw_keys(sk_bytes: Uint8Array, msg: Uint8Array): Uint8Array;
export class WasmECVRFKeypair {
  free(): void;
  constructor(sk: Uint8Array, pk: Uint8Array);
  readonly sk: Uint8Array;
  readonly pk: Uint8Array;
}
export class WasmVRFContractParameters {
  private constructor();
  free(): void;
  readonly output: Uint8Array;
  readonly proof: Uint8Array;
  readonly public_key: Uint8Array;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_wasmecvrfkeypair_free: (a: number, b: number) => void;
  readonly wasmecvrfkeypair_new: (a: number, b: number, c: number, d: number) => number;
  readonly wasmecvrfkeypair_sk: (a: number) => [number, number];
  readonly wasmecvrfkeypair_pk: (a: number) => [number, number];
  readonly generate_ecvrf_keypair: () => [number, number, number];
  readonly ecvrf_prove: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly ecvrf_verify: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly ecvrf_proof_to_hash: (a: number, b: number) => [number, number, number, number];
  readonly __wbg_wasmvrfcontractparameters_free: (a: number, b: number) => void;
  readonly wasmvrfcontractparameters_output: (a: number) => [number, number];
  readonly wasmvrfcontractparameters_proof: (a: number) => [number, number];
  readonly wasmvrfcontractparameters_public_key: (a: number) => [number, number];
  readonly generate_vrf_params_for_contract: (a: number, b: number, c: number, d: number) => [number, number, number];
  readonly generate_ecvrf_keypair_raw: () => [number, number, number];
  readonly ecvrf_prove_with_raw_keys: (a: number, b: number, c: number, d: number) => [number, number, number, number];
  readonly rustsecp256k1_v0_8_1_context_create: (a: number) => number;
  readonly rustsecp256k1_v0_8_1_context_destroy: (a: number) => void;
  readonly rustsecp256k1_v0_8_1_default_illegal_callback_fn: (a: number, b: number) => void;
  readonly rustsecp256k1_v0_8_1_default_error_callback_fn: (a: number, b: number) => void;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

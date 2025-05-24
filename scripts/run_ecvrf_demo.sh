#!/bin/bash
output_json() {
    if command -v jq &> /dev/null; then
        local json_obj="{}"
        while [ "$#" -gt 0 ]; do
            local key="$1"
            local value="$2"
            json_obj=$(echo "$json_obj" | jq --arg k "$key" --arg v "$value" '. + {($k): $v}')
            shift 2
        done
        echo "$json_obj"
    else
        printf "{\n"
        while [ "$#" -gt 0 ]; do
            printf "  \"%s\": \"%s\"" "$1" "$2"
            shift 2
            if [ "$#" -gt 0 ]; then
                printf ",\n"
            else
                printf "\n"
            fi
        done
        printf "}\n"
    fi
}

exec 3>&1
exec 1>/dev/null
exec 2>/dev/null

ORIGINAL_FASTCRYPTO_PATH_SET=false
if [ -n "$FASTCRYPTO_PATH" ]; then
    ORIGINAL_FASTCRYPTO_PATH_SET=true
fi

TEMP_FASTCRYPTO_PATH=""

if $ORIGINAL_FASTCRYPTO_PATH_SET; then
    TEMP_FASTCRYPTO_PATH="$FASTCRYPTO_PATH"
elif [ -d "../external/fastcrypto" ] && [ -f "../external/fastcrypto/Cargo.toml" ]; then
    TEMP_FASTCRYPTO_PATH="../external/fastcrypto/"
    echo "INFO: Found fastcrypto submodule at: $TEMP_FASTCRYPTO_PATH (preferred custom path)" >&3
elif [ -d "./fastcrypto" ] && [ -f "./fastcrypto/Cargo.toml" ]; then
    TEMP_FASTCRYPTO_PATH="./fastcrypto"
    echo "INFO: Found fastcrypto submodule at: $TEMP_FASTCRYPTO_PATH" >&3
else
    echo "ERROR: FASTCRYPTO_PATH environment variable is not set, and fastcrypto submodule not found at ./extern/fastcrypto or ./fastcrypto." >&3
    echo "Please set FASTCRYPTO_PATH to the root directory of your fastcrypto clone/submodule." >&3
    echo "Example: export FASTCRYPTO_PATH=/path/to/fastcrypto" >&3
    exit 1
fi

if [ ! -d "$TEMP_FASTCRYPTO_PATH" ] || [ ! -f "$TEMP_FASTCRYPTO_PATH/Cargo.toml" ]; then
    echo "ERROR: FASTCRYPTO_PATH ('$TEMP_FASTCRYPTO_PATH') is not a valid fastcrypto directory (Cargo.toml not found)." >&3
    exit 1
fi

FASTCRYPTO_PATH=$(cd "$TEMP_FASTCRYPTO_PATH" && pwd)
echo "INFO: Using fastcrypto from: $FASTCRYPTO_PATH" >&3

exec 1>&3
exec 2>&3
exec 3>&-

keygen_output=$(cd "$FASTCRYPTO_PATH" && cargo run --quiet --bin ecvrf-cli -- keygen 2>&1)

if [ $? -ne 0 ]; then
    output_json "status" "error" "step" "keygen" "message" "Key generation failed." "details" "$keygen_output"
    exit 1
fi

SECRET_KEY=$(echo "$keygen_output" | awk -F': ' '/Secret key:/ {print $2}')
PUBLIC_KEY=$(echo "$keygen_output" | awk -F': ' '/Public key:/ {print $2}')

if [ -z "$SECRET_KEY" ] || [ -z "$PUBLIC_KEY" ]; then
    output_json "status" "error" "step" "keygen_parse" "message" "Could not parse keys from keygen output." "details" "$keygen_output"
    exit 1
fi
# change this input string to test different inputs
INPUT_STRING="Hello, world"
INPUT_HEX=$(echo -n "$INPUT_STRING" | xxd -p -c 256)

prove_output=$(cd "$FASTCRYPTO_PATH" && cargo run --quiet --bin ecvrf-cli -- prove --input "$INPUT_HEX" --secret-key "$SECRET_KEY" 2>&1)

if [ $? -ne 0 ]; then
    output_json "status" "error" "step" "prove" "message" "Prove command failed." "secretKey" "$SECRET_KEY" "publicKey" "$PUBLIC_KEY" "inputHex" "$INPUT_HEX" "details" "$prove_output"
    exit 1
fi

PROOF=$(echo "$prove_output" | awk -F':  ' '/Proof:/ {print $2}')
VRF_OUTPUT=$(echo "$prove_output" | awk -F': ' '/Output:/ {print $2}')

if [ -z "$PROOF" ] || [ -z "$VRF_OUTPUT" ]; then
    output_json "status" "error" "step" "prove_parse" "message" "Could not parse proof and output from prove command." "secretKey" "$SECRET_KEY" "publicKey" "$PUBLIC_KEY" "inputHex" "$INPUT_HEX" "details" "$prove_output"
    exit 1
fi

verify_output=$(cd "$FASTCRYPTO_PATH" && cargo run --quiet --bin ecvrf-cli -- verify --output "$VRF_OUTPUT" --proof "$PROOF" --input "$INPUT_HEX" --public-key "$PUBLIC_KEY" 2>&1)

verify_result=$(echo "$verify_output" | tail -1)

if [ $? -ne 0 ] || [[ "$verify_result" != "Proof verified correctly!" ]]; then
    output_json \
        "status" "error" \
        "step" "verify" \
        "message" "Verification failed or did not return expected message." \
        "secretKey" "$SECRET_KEY" \
        "publicKey" "$PUBLIC_KEY" \
        "inputHex" "$INPUT_HEX" \
        "proof" "$PROOF" \
        "vrfOutput" "$VRF_OUTPUT" \
        "verificationCliOutput" "$verify_result"
    exit 1
fi

output_json \
    "status" "success" \
    "secretKey" "$SECRET_KEY" \
    "publicKey" "0x$PUBLIC_KEY" \
    "inputString" "$INPUT_STRING" \
    "inputHex" "$INPUT_HEX" \
    "proof" "0x$PROOF" \
    "vrfOutput" "0x$VRF_OUTPUT" \
    "verificationStatus" "Proof verified correctly!"
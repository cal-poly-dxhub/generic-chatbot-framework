#!/bin/bash
set -e

# Default values
REGION="us-east-1"
OUTPUT_FILE=""
LIST_ALL=false
MODELS=()

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Function to print usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo
    echo "Options:"
    echo "  -m, --models     Specify model IDs (space-separated)"
    echo "  -r, --region     AWS region (default: us-east-1)"
    echo "  -o, --output     Output file (JSON format)"
    echo "  -l, --list-all   List all available models"
    echo "  -h, --help       Show this help message"
    echo
    echo "Example:"
    echo "  $0 -m \"anthropic.claude-v2 amazon.titan-text-express-v1\" -r us-east-1 -o model_status"
    echo "  $0 --list-all"
}

# Function to check if AWS CLI is installed
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        exit 1
    fi
}

# Function to check AWS credentials
check_aws_credentials() {
    if ! aws sts get-caller-identity &> /dev/null; then
        echo -e "${RED}Error: AWS credentials not configured${NC}"
        exit 1
    fi
}

# Function to format JSON output
format_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        cat
    fi
}

# Function to check single model status
check_model_status() {
    local model_id=$1
    local region=$2
        
    aws bedrock get-foundation-model \
        --model-identifier "$model_id" \
        --region "$region" \
        2>/dev/null | format_json
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error accessing model: $model_id${NC}"
        return 1
    fi
}

# Function to list all models
list_all_models() {
    local region=$1
    
    echo -e "\nListing all available models in region: ${YELLOW}$region${NC}"
    
    aws bedrock list-foundation-models \
        --region "$region" \
        --query "modelSummaries[].{ModelId:modelId,Status:modelLifecycle.status,Provider:providerName}" \
        --output table
}

# Function to save results to file
save_results() {
    local content=$1
    local output_file=$2
    local timestamp=$(date +"%Y-%m-%d_%H-%M-%S")
    local filename="${output_file}_${timestamp}.json"
    
    echo "$content" > "$filename"
    echo -e "\nResults saved to: ${GREEN}$filename${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--models)
            IFS=' ' read -r -a MODELS <<< "$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -l|--list-all)
            LIST_ALL=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Check prerequisites
check_aws_cli
check_aws_credentials

# Main execution
if [ "$LIST_ALL" = true ]; then
    results=$(list_all_models "$REGION")
    echo "$results"
    
    if [ -n "$OUTPUT_FILE" ]; then
        save_results "$results" "$OUTPUT_FILE"
    fi
elif [ ${#MODELS[@]} -gt 0 ]; then
    # Create a temporary file for collecting results
    temp_file=$(mktemp)
    echo "[" > "$temp_file"
    
    for i in "${!MODELS[@]}"; do
        result=$(check_model_status "${MODELS[$i]}" "$REGION")
        echo "$result" >> "$temp_file"
        
        # Add comma if not the last element
        if [ $i -lt $(( ${#MODELS[@]} - 1 )) ]; then
            echo "," >> "$temp_file"
        fi
    done
    
    echo "]" >> "$temp_file"
    
    # Format and display results
    cat "$temp_file" | format_json
    
    # Save to output file if specified
    if [ -n "$OUTPUT_FILE" ]; then
        save_results "$(cat "$temp_file")" "$OUTPUT_FILE"
    fi
    
    # Cleanup
    rm "$temp_file"
else
    echo -e "${RED}Error: No models specified${NC}"
    usage
    exit 1
fi

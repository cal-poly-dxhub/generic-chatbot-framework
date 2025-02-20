import json
import boto3
import decimal
from pathlib import Path

def get_messages_by_chat_id(table_name, chat_id, region):
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)

    response = table.scan(
        FilterExpression="chatId = :chat_id AND entity = :message",
        ExpressionAttributeValues={
            ":chat_id": chat_id,
            ":message": "MESSAGE"
        }
    )

    return response.get("Items", [])

def convert_decimals(obj):
    if isinstance(obj, list):
        return [convert_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, decimal.Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    else:
        return obj


def get_model_costs(model_id):
    base_directory = Path(__file__).parent
    json_file_path = base_directory / "model_costs.json"

    with open(json_file_path, "r") as file:
        json_data = file.read()

    cost_per_token = json.loads(json_data)
    # Cost format is (input_cost, output_cost)
    cost_per_token = {key: tuple(value) for key, value in cost_per_token.items()}

    if model_id in cost_per_token:
        input_cost, output_cost = cost_per_token[model_id]
    else:
        input_cost = output_cost = 0
        print("Invalid model Identifier")

    return input_cost, output_cost

def get_cost_per_chat(chat_id, model_id, conversation_table_name, region):
    messages = get_messages_by_chat_id(conversation_table_name, chat_id, region)
    messages = convert_decimals(messages)

    input_tokens = output_tokens = 0
    for message in messages:
        if message["messageType"] == "human":
            input_tokens += int(message['tokens'])
        elif message["messageType"] == "ai":
            output_tokens += int(message['tokens'])

    input_cost, output_cost = get_model_costs(model_id)

    total_cost = (input_cost * input_tokens) + (output_cost * output_tokens)

    return total_cost
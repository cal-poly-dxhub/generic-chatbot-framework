# # lib/backend/conversation/routes/feedback_download_routes.py
# # Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# # SPDX-License-Identifier: Apache-2.0
# from typing import Dict, List
# from datetime import datetime
# from decimal import Decimal


# from aws_lambda_powertools import Logger, Tracer
# from aws_lambda_powertools.event_handler.api_gateway import Router, Response
# from conversation_store import get_chat_history_store

# tracer = Tracer()
# router = Router()
# logger = Logger()

# @router.get("/feedback/download")
# @tracer.capture_method
# def download_feedback() -> Dict:
#     """Download all feedback as a text file"""    
#     user_id = router.context.get("user_id", "")
#     logger.info(f"User {user_id} is downloading feedback")
    
#     cors_headers = {
#         "Access-Control-Allow-Origin": "*",
#         "Access-Control-Allow-Methods": "*",
#         "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With"
#     }
    
#     chat_history_store = get_chat_history_store()
    
#     total_input_tokens = Decimal('0')
#     total_output_tokens = Decimal('0')
#     total_user_cost = Decimal('0')
#     total_assistant_cost = Decimal('0') 
#     total_cost = Decimal('0')
    
#     response = chat_history_store.table.scan(
#         FilterExpression="entity = :entity",
#         ExpressionAttributeValues={":entity": "CHAT"}
#     )
    
#     chat_items = response.get('Items', [])
    
#     while 'LastEvaluatedKey' in response:
#         response = chat_history_store.table.scan(
#             FilterExpression="entity = :entity",
#             ExpressionAttributeValues={":entity": "CHAT"},
#             ExclusiveStartKey=response['LastEvaluatedKey']
#         )
#         chat_items.extend(response.get('Items', []))
    
#     for chat_item in chat_items:
#         if "tokens" in chat_item:
#             tokens_data = chat_item["tokens"]
#             if isinstance(tokens_data, dict):
#                 if "input_tokens" in tokens_data:
#                     input_tokens = tokens_data["input_tokens"]
#                     if not isinstance(input_tokens, Decimal):
#                         input_tokens = Decimal(str(input_tokens))
#                     total_input_tokens += input_tokens
                    
#                 if "output_tokens" in tokens_data:
#                     output_tokens = tokens_data["output_tokens"]
#                     if not isinstance(output_tokens, Decimal):
#                         output_tokens = Decimal(str(output_tokens))
#                     total_output_tokens += output_tokens
        
#         if "cost" in chat_item:
#             cost_data = chat_item["cost"]
#             if isinstance(cost_data, dict):
#                 if "user_cost" in cost_data:
#                     user_cost = cost_data["user_cost"]
#                     if not isinstance(user_cost, Decimal):
#                         user_cost = Decimal(str(user_cost))
#                     total_user_cost += user_cost
                    
#                 if "assistant_cost" in cost_data:
#                     assistant_cost = cost_data["assistant_cost"]
#                     if not isinstance(assistant_cost, Decimal):
#                         assistant_cost = Decimal(str(assistant_cost))
#                     total_assistant_cost += assistant_cost
                    
#                 if "total_cost" in cost_data:
#                     this_total_cost = cost_data["total_cost"]
#                     if not isinstance(this_total_cost, Decimal):
#                         this_total_cost = Decimal(str(this_total_cost))
#                     total_cost += this_total_cost
    
#     response = chat_history_store.table.scan(
#         FilterExpression="attribute_exists(feedback)"
#     )
    
#     feedback_items = response.get('Items', [])
    
#     while 'LastEvaluatedKey' in response:
#         response = chat_history_store.table.scan(
#             FilterExpression="attribute_exists(feedback)",
#             ExclusiveStartKey=response['LastEvaluatedKey']
#         )
#         feedback_items.extend(response.get('Items', []))
    
#     if not feedback_items:
#         return Response(
#             status_code=200,
#             content_type="application/json",
#             body={"message": "No feedback found"},
#             headers=cors_headers
#         )
    
#     source_map = {}
    
#     response = chat_history_store.table.scan(
#         FilterExpression="entity = :entity",
#         ExpressionAttributeValues={":entity": "SOURCE"}
#     )
    
#     source_items = response.get('Items', [])
    
#     while 'LastEvaluatedKey' in response:
#         response = chat_history_store.table.scan(
#             FilterExpression="entity = :entity",
#             ExpressionAttributeValues={":entity": "SOURCE"},
#             ExclusiveStartKey=response['LastEvaluatedKey']
#         )
#         source_items.extend(response.get('Items', []))
    
#     for source_item in source_items:
#         message_id = source_item.get("messageId", "")
#         if message_id:
#             if message_id not in source_map:
#                 source_map[message_id] = []
            
#             metadata = source_item.get("metadata", {})
#             source_url = metadata.get("source_url", "")
#             s3_uri = metadata.get("s3_uri", "")
            
#             source_map[message_id].append({
#                 "source_url": source_url,
#                 "s3_uri": s3_uri
#             })
    
#     lines = []
#     lines.append("USER FEEDBACK REPORT")
#     lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
#     lines.append("=" * 80)
    
#     lines.append("=" * 80)
#     lines.append("")
    
#     lines.append("COST SUMMARY (Across All Chats)")
#     lines.append(f"Total Chats: {len(chat_items)}")
#     lines.append(f"Total Input Tokens: {total_input_tokens:,}")
#     lines.append(f"Total Output Tokens: {total_output_tokens:,}")
#     lines.append(f"Total Tokens: {(total_input_tokens + total_output_tokens):,}")
#     lines.append(f"User Cost: ${float(total_user_cost):.6f}")
#     lines.append(f"Assistant Cost: ${float(total_assistant_cost):.6f}")
#     lines.append(f"Total Cost: ${float(total_cost):.6f}")
#     lines.append("=" * 80)
#     lines.append("")
    
#     lines.append(f"FEEDBACK ITEMS: {len(feedback_items)}")
#     lines.append("=" * 80)
#     lines.append("")
    
#     # Process each feedback item
#     for item in feedback_items:
#         user_id = item.get("userId", "unknown")
#         message_id = item.get("messageId", "unknown")
#         chat_id = item.get("chatId", "unknown")
#         thumb = item.get("thumb", "none")
#         feedback_text = item.get("feedback", "")
#         created_at = datetime.fromtimestamp(int(item.get("createdAt", 0))/1000).strftime('%Y-%m-%d %H:%M:%S')
        
#         ai_message_content = item.get("data", {}).get("content", "")
        
#         messages, _ = chat_history_store.list_chat_messages(
#             user_id=user_id, 
#             chat_id=chat_id,
#             limit=100,
#             ascending=True
#         )
        
#         ai_message_index = -1
#         for i, msg in enumerate(messages):
#             if msg.messageId == message_id:
#                 ai_message_index = i
#                 break
        
#         user_question = "User question not found"
#         if ai_message_index > 0:
#             for i in range(ai_message_index-1, -1, -1):
#                 if messages[i].messageType == "human":
#                     user_question = messages[i].content
#                     break
        
#         lines.append(f"USER ID: {user_id}")
#         lines.append(f"CHAT ID: {chat_id}")
#         lines.append(f"MESSAGE ID: {message_id}")
#         lines.append(f"TIMESTAMP: {created_at}")
#         lines.append("USER QUESTION:")
#         lines.append(user_question)
#         lines.append("AI RESPONSE:")
#         lines.append(ai_message_content)
        
#         if message_id in source_map and source_map[message_id]:
#             lines.append("SOURCES:")
#             for idx, source in enumerate(source_map[message_id], 1):
#                 source_url = source.get("source_url", "")
#                 s3_uri = source.get("s3_uri", "")
#                 lines.append(f"  {idx}. URL: {source_url}")
#                 if s3_uri:
#                     lines.append(f"     S3 URI: {s3_uri}")
#         else:
#             lines.append("SOURCES: None")
            
#         lines.append("FEEDBACK:")
#         lines.append(feedback_text if feedback_text else "(No text provided)")
#         lines.append(f"RATING: {thumb}")
#         lines.append("-" * 80)
#         lines.append("")
    
#     feedback_text = "\n".join(lines)
    
#     timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
#     filename = f"user_feedback_{timestamp}.txt"
    
#     return Response(
#         status_code=200,
#         content_type="text/plain",
#         body=feedback_text,
#         headers={
#             **cors_headers,
#             "Content-Disposition": f"attachment; filename=\"{filename}\"",
#             "Content-Type": "text/plain; charset=utf-8"
#         }
#     )
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import os
import boto3
from botocore.exceptions import ClientError
from typing import Dict, List
from datetime import datetime
from decimal import Decimal

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router, Response
from conversation_store import get_chat_history_store

tracer = Tracer()
router = Router()
logger = Logger()
cognito_client = boto3.client('cognito-idp')

email_cache = {}

@tracer.capture_method
def get_user_email(user_id, user_pool_id):
    """Get user email from Cognito by user ID"""
    if user_id in email_cache:
        return email_cache[user_id]
        
    try:
        if '/' in user_id:
            user_id = user_id.split('/')[-1]
            
        response = cognito_client.admin_get_user(
            UserPoolId=user_pool_id,
            Username=user_id
        )
        
        for attr in response.get('UserAttributes', []):
            if attr['Name'] == 'email':
                email_cache[user_id] = attr['Value']
                return attr['Value']
                
        email_cache[user_id] = user_id
        return user_id
        
    except ClientError as e:
        logger.warning(f"Error fetching user email for {user_id}: {str(e)}")
        email_cache[user_id] = user_id
        return user_id

@router.get("/feedback/download")
@tracer.capture_method
def download_feedback() -> Dict:
    """Download all feedback as a text file"""    
    user_id = router.context.get("user_id", "")
    logger.info(f"User {user_id} is downloading feedback")
    
    user_pool_id = os.environ.get('COGNITO_USER_POOL_ID', '')
    
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Requested-With"
    }
    
    chat_history_store = get_chat_history_store()
    
    total_input_tokens = Decimal('0')
    total_output_tokens = Decimal('0')
    total_user_cost = Decimal('0')
    total_assistant_cost = Decimal('0') 
    total_cost = Decimal('0')
    
    response = chat_history_store.table.scan(
        FilterExpression="entity = :entity",
        ExpressionAttributeValues={":entity": "CHAT"}
    )
    
    chat_items = response.get('Items', [])
    
    while 'LastEvaluatedKey' in response:
        response = chat_history_store.table.scan(
            FilterExpression="entity = :entity",
            ExpressionAttributeValues={":entity": "CHAT"},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        chat_items.extend(response.get('Items', []))
    
    for chat_item in chat_items:
        if "tokens" in chat_item:
            tokens_data = chat_item["tokens"]
            if isinstance(tokens_data, dict):
                if "input_tokens" in tokens_data:
                    input_tokens = tokens_data["input_tokens"]
                    if not isinstance(input_tokens, Decimal):
                        input_tokens = Decimal(str(input_tokens))
                    total_input_tokens += input_tokens
                    
                if "output_tokens" in tokens_data:
                    output_tokens = tokens_data["output_tokens"]
                    if not isinstance(output_tokens, Decimal):
                        output_tokens = Decimal(str(output_tokens))
                    total_output_tokens += output_tokens
        
        if "cost" in chat_item:
            cost_data = chat_item["cost"]
            if isinstance(cost_data, dict):
                if "user_cost" in cost_data:
                    user_cost = cost_data["user_cost"]
                    if not isinstance(user_cost, Decimal):
                        user_cost = Decimal(str(user_cost))
                    total_user_cost += user_cost
                    
                if "assistant_cost" in cost_data:
                    assistant_cost = cost_data["assistant_cost"]
                    if not isinstance(assistant_cost, Decimal):
                        assistant_cost = Decimal(str(assistant_cost))
                    total_assistant_cost += assistant_cost
                    
                if "total_cost" in cost_data:
                    this_total_cost = cost_data["total_cost"]
                    if not isinstance(this_total_cost, Decimal):
                        this_total_cost = Decimal(str(this_total_cost))
                    total_cost += this_total_cost
    
    response = chat_history_store.table.scan(
        FilterExpression="attribute_exists(feedback)"
    )
    
    feedback_items = response.get('Items', [])
    
    while 'LastEvaluatedKey' in response:
        response = chat_history_store.table.scan(
            FilterExpression="attribute_exists(feedback)",
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        feedback_items.extend(response.get('Items', []))
    
    if not feedback_items:
        return Response(
            status_code=200,
            content_type="application/json",
            body={"message": "No feedback found"},
            headers=cors_headers
        )
    
    source_map = {}
    
    response = chat_history_store.table.scan(
        FilterExpression="entity = :entity",
        ExpressionAttributeValues={":entity": "SOURCE"}
    )
    
    source_items = response.get('Items', [])
    
    while 'LastEvaluatedKey' in response:
        response = chat_history_store.table.scan(
            FilterExpression="entity = :entity",
            ExpressionAttributeValues={":entity": "SOURCE"},
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        source_items.extend(response.get('Items', []))
    
    for source_item in source_items:
        message_id = source_item.get("messageId", "")
        if message_id:
            if message_id not in source_map:
                source_map[message_id] = []
            
            metadata = source_item.get("metadata", {})
            source_url = metadata.get("source_url", "")
            s3_uri = metadata.get("s3_uri", "")
            
            source_map[message_id].append({
                "source_url": source_url,
                "s3_uri": s3_uri
            })
    
    lines = []
    lines.append("USER FEEDBACK REPORT")
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("=" * 80)
    
    lines.append("=" * 80)
    lines.append("")
    
    lines.append("COST SUMMARY (Across All Chats)")
    lines.append(f"Total Chats: {len(chat_items)}")
    lines.append(f"Total Input Tokens: {total_input_tokens:,}")
    lines.append(f"Total Output Tokens: {total_output_tokens:,}")
    lines.append(f"Total Tokens: {(total_input_tokens + total_output_tokens):,}")
    lines.append(f"User Cost: \${float(total_user_cost):.6f}")
    lines.append(f"Assistant Cost: \${float(total_assistant_cost):.6f}")
    lines.append(f"Total Cost: \${float(total_cost):.6f}")
    lines.append("=" * 80)
    lines.append("")
    
    lines.append(f"FEEDBACK ITEMS: {len(feedback_items)}")
    lines.append("=" * 80)
    lines.append("")
    
    for item in feedback_items:
        user_id = item.get("userId", "unknown")
        user_email = get_user_email(user_id, user_pool_id) if user_pool_id and user_id != "unknown" else user_id
        
        message_id = item.get("messageId", "unknown")
        chat_id = item.get("chatId", "unknown")
        thumb = item.get("thumb", "none")
        feedback_text = item.get("feedback", "")
        created_at = datetime.fromtimestamp(int(item.get("createdAt", 0))/1000).strftime('%Y-%m-%d %H:%M:%S')
        
        ai_message_content = item.get("data", {}).get("content", "")
        
        messages, _ = chat_history_store.list_chat_messages(
            user_id=user_id, 
            chat_id=chat_id,
            limit=100,
            ascending=True
        )
        
        ai_message_index = -1
        for i, msg in enumerate(messages):
            if msg.messageId == message_id:
                ai_message_index = i
                break
        
        user_question = "User question not found"
        if ai_message_index > 0:
            for i in range(ai_message_index-1, -1, -1):
                if messages[i].messageType == "human":
                    user_question = messages[i].content
                    break
        
        lines.append(f"USER EMAIL: {user_email}")
        lines.append(f"CHAT ID: {chat_id}")
        lines.append(f"MESSAGE ID: {message_id}")
        lines.append(f"TIMESTAMP: {created_at}")
        lines.append("USER QUESTION:")
        lines.append(user_question)
        lines.append("AI RESPONSE:")
        lines.append(ai_message_content)
        
        if message_id in source_map and source_map[message_id]:
            lines.append("SOURCES:")
            for idx, source in enumerate(source_map[message_id], 1):
                source_url = source.get("source_url", "")
                s3_uri = source.get("s3_uri", "")
                lines.append(f"  {idx}. URL: {source_url}")
                if s3_uri:
                    lines.append(f"     S3 URI: {s3_uri}")
        else:
            lines.append("SOURCES: None")
            
        lines.append("FEEDBACK:")
        lines.append(feedback_text if feedback_text else "(No text provided)")
        lines.append(f"RATING: {thumb}")
        lines.append("-" * 80)
        lines.append("")
    
    feedback_text = "\n".join(lines)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"user_feedback_{timestamp}.txt"
    
    return Response(
        status_code=200,
        content_type="text/plain",
        body=feedback_text,
        headers={
            **cors_headers,
            "Content-Disposition": f"attachment; filename=\"{filename}\"",
            "Content-Type": "text/plain; charset=utf-8"
        }
    )
import boto3
import json


class CustomEncoder(json.JSONEncoder):
    def default(self, o):
        try:
            return super().default(o)
        except TypeError:
            # Fallback to string for non-serializable objects
            return str(o)


def get_resources(stack_name, resource_type):
    client = boto3.client("cloudformation")
    paginator = client.get_paginator("list_stack_resources")
    response_iterator = paginator.paginate(StackName=stack_name)

    resources = []
    for response in response_iterator:
        with open("list_stack_resources_response.json", "a") as f:
            json.dump(response, f, cls=CustomEncoder, indent=4)
        for resource in response["StackResourceSummaries"]:
            if resource["ResourceType"] == resource_type:
                resources.append(resource["PhysicalResourceId"])
    return resources


def deactivate_deletion_protection(user_pool_id):
    client = boto3.client("cognito-idp")

    client.describe_user_pool(UserPoolId=user_pool_id)

    response = client.describe_user_pool(UserPoolId=user_pool_id)
    sms_config = response["UserPool"]["SmsConfiguration"]

    # To disable
    client.update_user_pool(
        UserPoolId=user_pool_id,
        AutoVerifiedAttributes=["email", "phone_number"],
        UserAttributeUpdateSettings={
            "AttributesRequireVerificationBeforeUpdate": [
                "email",
                "phone_number",
            ],
        },
        SmsConfiguration=sms_config,
    )

    client.update_user_pool(
        UserPoolId=user_pool_id,
        UserAttributeUpdateSettings={
            "AttributesRequireVerificationBeforeUpdate": [],
        },
        AutoVerifiedAttributes=[],
    )

    client.update_user_pool(UserPoolId=user_pool_id, DeletionProtection="INACTIVE")


def set_deletion_policy(stack_name, resource_logical_id, resource_type):
    client = boto3.client("cloudformation")

    # Retrieve the current template
    response = client.get_template(StackName=stack_name)
    template = response["TemplateBody"]

    # If the template is a string, parse it as JSON
    if isinstance(template, str):
        template = json.loads(template)

    # Update the template to include the deletion policy
    if "Resources" in template and resource_logical_id in template["Resources"]:
        if template["Resources"][resource_logical_id]["Type"] == resource_type:
            template["Resources"][resource_logical_id]["DeletionPolicy"] = "Delete"
        else:
            raise ValueError(f"Resource logical ID '{resource_logical_id}' is not of type '{resource_type}'")
    else:
        raise ValueError(f"Resource logical ID '{resource_logical_id}' not found in the template")

    # Update the stack with the modified template
    client.update_stack(StackName=stack_name, TemplateBody=json.dumps(template), Capabilities=["CAPABILITY_IAM"])


def set_dynamodb_table_deletion_policy(table_name):
    client = boto3.client("dynamodb")
    client.delete_table(TableName=table_name)


def main():
    stack_name = input("Enter the CDK stack name: ")

    print("Handling Cognito pools")
    # Handle Cognito User Pools
    user_pools = get_resources(stack_name, "AWS::Cognito::UserPool")
    for user_pool_id in user_pools:
        try:
            deactivate_deletion_protection(user_pool_id)
        except Exception as e:
            print(f"Error deactivating deletion protection for user pool: {user_pool_id}")
            print(e)
        print(f"Deactivated deletion protection for user pool: {user_pool_id}")

    print("Handling S3 buckets and DynamoDB tables")
    # Handle S3 Buckets
    s3_buckets = get_resources(stack_name, "AWS::S3::Bucket")
    print("S3 buckets:\n", s3_buckets)
    for bucket_name in s3_buckets:
        try:
            set_deletion_policy(stack_name, bucket_name, "AWS::S3::Bucket")
        except Exception as e:
            print(f"Error setting deletion policy for S3 bucket: {bucket_name}")
            print(e)
        print(f"Set deletion policy for: {bucket_name}")

    # Handle DynamoDB Tables
    dynamodb_tables = get_resources(stack_name, "AWS::DynamoDB::Table")
    print("Dynamo tables:\n", dynamodb_tables)
    for table_name in dynamodb_tables:
        try:
            set_deletion_policy(stack_name, table_name, "AWS::DynamoDB::Table")
        except Exception as e:
            print(f"Error setting deletion policy for DynamoDB table: {table_name}")
            print(e)
        print(f"Set deletion policy for Dynamo Table: {table_name}")


if __name__ == "__main__":
    main()

import boto3
from typing import List, Dict, Tuple, Optional, Union, Any
import boto3
import os
from textractor import Textractor
from textractor.data.constants import TextractFeatures
from urllib.parse import urlparse

def extract_textract_data(s3,  s3_file, bucket_name):
    """Extract structured text data using Textract."""

    extractor = Textractor()
    
    file_name, ext = os.path.splitext(s3_file)
    
    document = extractor.start_document_analysis(
        file_source=s3_file,
        features=[TextractFeatures.LAYOUT, TextractFeatures.TABLES],
        save_image=False,
        s3_output_path=f"s3://{bucket_name}/textract-output/{file_name}/"
    )

    print("Document analysis started... ")

    # Download pdf from s3
    local_pdf_path = f"/tmp/{os.path.basename(file_name)}"
    download_from_s3(s3, s3_file, local_pdf_path)

    return document, local_pdf_path

def download_from_s3(s3, s3_path, local_path):
    s3_bucket, s3_key = s3_path.replace("s3://", "").split("/", 1)
    s3.download_file(s3_bucket, s3_key, local_path)

def retrieve_source_url_metadata(file_uri):
    try:
        # Parse S3 URI
        parsed_uri = urlparse(file_uri)
        
        if parsed_uri.scheme != 's3':
            raise ValueError(f"Invalid URI scheme: {parsed_uri.scheme}. Expected 's3'")
        
        bucket_name = parsed_uri.netloc
        # Remove leading slash if present
        object_key = parsed_uri.path.lstrip('/')
        
        if not bucket_name or not object_key:
            raise ValueError(f"Invalid S3 URI format: {file_uri}")
        
        # Initialize S3 client
        s3_client = boto3.client('s3')
        
        # Get object metadata
        response = s3_client.head_object(
            Bucket=bucket_name,
            Key=object_key
        )
        
        # Extract source_url from metadata
        metadata = response.get('Metadata', {})
        source_url = metadata.get('source_url')
        
        return source_url
    
    except Exception as e:
        print(f"Error retrieving metadata: {e}")
        return None
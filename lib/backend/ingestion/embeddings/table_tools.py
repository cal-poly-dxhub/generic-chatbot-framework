import pdfplumber
import boto3
import io
import base64
from datetime import datetime
import os
import re

def save_table_image_to_s3(local_pdf_path, page_number, bounding_box, bucket_name, resolution=300, folder="image_store"):
    s3_client = boto3.client("s3")

    file_name = os.path.basename(local_pdf_path).replace(" ", "_")
    
    with pdfplumber.open(local_pdf_path) as pdf:
        # Get the specific page
        page = pdf.pages[page_number - 1]

        # Convert the page to an image
        img = page.to_image(resolution)
        
        # Get the dimensions of the image
        img_width, img_height = img.original.size

        # Calculate the crop box based on the bounding box
        left = int(bounding_box.x * img_width)
        top = int(bounding_box.y * img_height)
        right = int((bounding_box.x + bounding_box.width) * img_width)
        bottom = int((bounding_box.y + bounding_box.height) * img_height)

        # Convert the image to a PIL Image
        pil_img = img.original

        # Crop the image
        cropped_img = pil_img.crop((left, top, right, bottom))

        # Convert the cropped image to bytes
        buffered = io.BytesIO()
        cropped_img.save(buffered, format="PNG")
        buffered.seek(0)

        # Generate a unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        image_filename = f"{folder}/{file_name}_table_{timestamp}.png"

        # Upload to S3
        s3_client.upload_fileobj(buffered, bucket_name, image_filename, ExtraArgs={"ContentType": "image/png"})

        # Generate and return the S3 URL
        aws_region = os.getenv("AWS_REGION")
        s3_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{image_filename}"
        return s3_url

def extract_table_content(passage_chunk):
    table_base64 = ""
    table_context = ""
    table_match = re.search(r'<table>(.*?)</table>', passage_chunk, re.DOTALL)
    if table_match:
        table_content = table_match.group(1)
        base64_match = re.search(r'<base64>(.*?)</base64>', table_content, re.DOTALL)
        if base64_match:
            table_base64 = base64_match.group(1)
            table_context = re.sub(r'<base64>.*?</base64>', '', table_content, flags=re.DOTALL).strip()
        else:
            table_context = table_content.strip()
        
        passage_chunk = re.sub(r'<table>.*?</table>', '', passage_chunk, flags=re.DOTALL)
    
    return passage_chunk, table_base64, table_context
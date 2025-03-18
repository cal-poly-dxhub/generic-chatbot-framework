import os
import requests
import boto3
from urllib.parse import urlparse
import argparse

# Get the first argument as the S3 input bucket
parser = argparse.ArgumentParser()
parser.add_argument("bucket_name", help="The name of the S3 bucket to upload PDFs to")
args = parser.parse_args()
bucket_name = args.bucket_name

# Initialize an S3 client
s3_client = boto3.client("s3")


def download_pdf(url, download_folder):
    """
    Downloads a PDF from the given URL and saves it in the specified folder.
    Returns the file path of the downloaded file.
    """
    # Extract the last part of the URL as the file name
    file_name = os.path.basename(urlparse(url).path)

    # Ensure it is a PDF file
    if not file_name.endswith(".pdf"):
        print(f"Skipping non-PDF URL: {url}")
        return None

    file_path = os.path.join(download_folder, file_name)

    # Download the file
    try:
        response = requests.get(url)
        response.raise_for_status()
        with open(file_path, "wb") as f:
            f.write(response.content)
        print(f"Downloaded {file_name}")
        return file_path
    except requests.exceptions.RequestException as e:
        print(f"Failed to download {url}: {e}")
        return None


def upload_to_s3(file_path, bucket_name, source_url):
    """Uploads a file to an S3 bucket with custom metadata using put_object."""
    file_name = os.path.basename(file_path)
    s3_key = f"{file_name}"

    try:
        # Read file content
        with open(file_path, "rb") as file:
            file_content = file.read()

        # Upload using put_object instead of upload_file
        s3_client.put_object(
            Body=file_content, Bucket=bucket_name, Key=s3_key, ContentType="application/pdf", Metadata={"source_url": source_url}
        )
        print(f"Uploaded {file_name} to S3 at {s3_key} with source URL: {source_url}")

        os.remove(file_path)
        print(f"Removed local file: {file_path}")

    except Exception as e:
        print(f"Failed to upload {file_name} to S3: {e}")
        import traceback

        traceback.print_exc()


def process_pdfs_from_urls(url_list, download_folder, bucket_name):
    """
    Downloads PDFs from a list of URLs and uploads them to S3 with metadata.
    """
    # Ensure download folder exists
    if not os.path.exists(download_folder):
        os.makedirs(download_folder)

    # Iterate over the URLs
    for url in url_list:
        # Download the PDF
        file_path = download_pdf(url, download_folder)

        if file_path:
            # Upload the PDF to S3 with the custom source URL attribute
            upload_to_s3(file_path, bucket_name, url)


def main():
    with open("urls.txt", "r") as file:
        pdf_urls = [line.strip() for line in file if line.strip()]

    # Bucket and folder details
    download_folder = "./pdfs"

    # Start processing PDFs
    process_pdfs_from_urls(pdf_urls, download_folder, bucket_name)

    print("PDF Processing Complete!")


if __name__ == "__main__":
    main()


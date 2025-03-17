import os
import re
import json
import boto3
from botocore.config import Config
from typing import List, Dict, Tuple, Optional, Union, Any
from textractor.data.text_linearization_config import TextLinearizationConfig
from urllib.parse import urlparse
from langchain.docstore.document import Document
from aws_utils import *
from table_tools import *
from francis_toolkit.utils import get_vector_store, find_embedding_model_by_ref_key

config = Config(
    read_timeout=600,
    retries=dict(
        max_attempts=5
    )
)

bedrock_runtime = boto3.client(service_name='bedrock-runtime', config=config)
s3 = boto3.client("s3")


def strip_newline(cell: Any) -> str:
    """Remove newline characters from a cell value."""
    return str(cell).strip()

def sub_header_content_splitter(string: str) -> List[str]:
    """Split content by XML tags and return relevant segments."""
    pattern = re.compile(r'<<[^>]+>>')
    segments = re.split(pattern, string)
    result = []
    for segment in segments:
        if segment.strip():
            if "<header>" not in segment and "<list>" not in segment and "<table>" not in segment:
                segment = [x.strip() for x in segment.split('\n') if x.strip()]
                result.extend(segment)
            else:
                result.append(segment)
    return result

def split_list_items_(items: str) -> List[str]:
    """Split a string into a list of items, handling nested lists."""
    parts = re.split("(<<list>><list>|</list><</list>>)", items)
    output = []

    inside_list = False
    list_item = ""

    for p in parts:
        if p == "<<list>><list>":
            inside_list = True
            list_item = p
        elif p == "</list><</list>>":
            inside_list = False
            list_item += p
            output.append(list_item)
            list_item = ""
        elif inside_list:
            list_item += p.strip()
        else:
            output.extend(p.split('\n'))
    return output

def process_document(document, local_pdf_path: str) -> [Dict, Dict]:
    """Process a document from textract, extract different items."""

    config = TextLinearizationConfig(
        hide_figure_layout=False,
        title_prefix="<titles><<title>><title>",
        title_suffix="</title><</title>>",
        hide_header_layout=True,
        section_header_prefix="<headers><<header>><header>",
        section_header_suffix="</header><</header>>",
        table_prefix="<tables><table>",
        table_suffix="</table>",
        # figure_layout_prefix="<figure><figure>",
        # figure_layout_suffix="</figure>",
        list_layout_prefix="<<list>><list>",
        list_layout_suffix="</list><</list>>",
        hide_footer_layout=True,
        hide_page_num_layout=True,
    )

    csv_seperator = "|"  # "\t"
    document_holder = {}
    table_page = {}
    count = 0
    table_strings = []
    # Whether to handle merged cells by duplicating merged value across corresponding individual cells
    unmerge_span_cells = True
    # Loop through each page in the document
    for ids, page in enumerate(document.pages):
        table_count = len([word for word in page.get_text(config=config).split() if
                           "<tables><table>" in word])
        assert table_count == len(page.tables)
        content = page.get_text(config=config).split("<tables>")
        document_holder[ids] = []
        for idx, item in enumerate(content):
            if "<table>" in item:
                table = document.tables[count]

                bounding_box = table.bbox

                table_pg_number = table.page

                table_uri = save_table_image_to_s3(local_pdf_path, table_pg_number, bounding_box)

                if ids in table_page:
                    table_page[ids].append(table_uri)
                else:
                    table_page[ids] = [table_uri]

                
                # Extract table data and remaining content
                pattern = re.compile(r'<table>(.*?)(</table>)', re.DOTALL)
                data = item
                table_match = re.search(pattern, data)
                table_data = table_match.group(1) if table_match else ''
                remaining_content = data[table_match.end():] if table_match else data

                content[idx] = f"<<table>><table>{table_uri}</table><</table>>"  ## attach xml tags to differentiate table from other text
                count += 1

                if "<<list>>" in remaining_content:
                    output = split_list_items_(remaining_content)
                    output = [x.strip() for x in output if x.strip()]
                    document_holder[ids].extend([content[idx]] + output)
                else:
                    document_holder[ids].extend([content[idx]] + [x.strip() for x in remaining_content.split('\n') if
                                                                  x.strip()]) # split other text by new line to be independent items in the python list.
            else:
                if "<<list>>" in item and "<table>" not in item:
                    output = split_list_items_(item)
                    output = [x.strip() for x in output if x.strip()]
                    document_holder[ids].extend(output)
                else:
                    document_holder[ids].extend([x.strip() for x in item.split("\n") if x.strip()])

    page_mapping = {}
    current_page = 1
    
    for page in document.pages:
        page_content = page.get_text(config=config)
        page_mapping[current_page] = page_content
        current_page += 1

    # Flatten the nested list document_holder into a single list and Join the flattened list by "\n"
    flattened_list = [item for sublist in document_holder.values() for item in sublist]
    result = "\n".join(flattened_list)
    header_split = result.split("<titles>")

    return header_split, page_mapping

def chunk_document(header_split, file, BUCKET, page_mapping):
    """Document chunking"""
    csv_seperator = "|"
    max_words = 200
    chunks = {}
    table_header_dict = {}
    chunk_header_mapping = {}
    list_header_dict = {}

    # Function to find the page number for a given content
    def find_page_number(content):
        for page_num, page_content in page_mapping.items():
            if content in page_content:
                return page_num
        return None

    # iterate through each title section
    for title_ids, items in enumerate(header_split):
        title_chunks = []
        current_chunk = {"content": [], "metadata": {}}
        num_words = 0
        table_header_dict[title_ids] = {}
        chunk_header_mapping[title_ids] = {}
        list_header_dict[title_ids] = {}
        chunk_counter = 0
        last_known_page = 1

        doc_id = os.path.basename(file)

        for item_ids, item in enumerate(items.split('<headers>')):  # headers
            lines = sub_header_content_splitter(item)
            SECTION_HEADER = None
            TITLES = None
            num_words = 0
            for ids_line, line in enumerate(lines):  # header lines
                if line.strip():
                    # Find the page number for this line
                    page_number = find_page_number(line)
                    if page_number:
                        last_known_page = page_number
                    current_chunk["metadata"]["page"] = last_known_page

                    if "<title>" in line:
                        TITLES = re.findall(r'<title>(.*?)</title>', line)[0].strip()
                        line = TITLES
                        current_chunk["metadata"]["title"] = TITLES
                        if re.sub(r'<[^>]+>', '', "".join(lines)).strip() == TITLES:
                            chunk_header_mapping[title_ids][chunk_counter] = lines
                            chunk_counter += 1
                    if "<header>" in line:
                        SECTION_HEADER = re.findall(r'<header>(.*?)</header>', line)[0].strip()
                        line = SECTION_HEADER
                        current_chunk["metadata"]["section_header"] = SECTION_HEADER
                        first_header_portion = True
                    next_num_words = num_words + len(re.findall(r'\w+', line))

                    if "<table>" in line or "<list>" in line:
                        # For tables and lists, we'll use the last known page number
                        current_chunk["metadata"]["page"] = last_known_page

                    if "<table>" not in line and "<list>" not in line:
                        if next_num_words > max_words and "".join(current_chunk["content"]).strip() != SECTION_HEADER and current_chunk["content"] and "".join(current_chunk["content"]).strip() != TITLES:
                            if SECTION_HEADER:
                                if first_header_portion:
                                    first_header_portion = False
                                else:
                                    current_chunk["content"].insert(0, SECTION_HEADER.strip())

                            title_chunks.append(current_chunk)
                            chunk_header_mapping[title_ids][chunk_counter] = lines

                            current_chunk = {"content": [], "metadata": {}}
                            if SECTION_HEADER:
                                current_chunk["metadata"]["section_header"] = SECTION_HEADER
                            if TITLES:
                                current_chunk["metadata"]["title"] = TITLES
                            num_words = 0
                            chunk_counter += 1

                        current_chunk["content"].append(line)
                        num_words += len(re.findall(r'\w+', line))


                    if "<table>" in line:
                        # Get table header which is usually line before table in document
                        line_index = lines.index(line)
                        if line_index != 0 and "<table>" not in lines[line_index - 1] and "<list>" not in lines[line_index - 1]:
                            header = lines[line_index - 1].replace("<header>", "").replace("</header>", "")
                        else:
                            header = ""

                        # Extract the uri data
                        table_uri = re.search(r'<table>(.*?)</table>', line).group(1)
                        
                        # Add the table as a whole to the current chunk
                        current_chunk["content"].append(f"<table>{header}<base64>{table_uri}</base64></table>")
                        
                        # Reset num_words to 0 as we're not counting words in the table
                        num_words = 0

                    if "<list>" in line:
                        # Get list header which is usually line before list in document
                        line_index = lines.index(line)
                        if line_index != 0 and "<table>" not in lines[line_index - 1] and "<list>" not in lines[
                            line_index - 1]:  # Check if table or list is the previous item on the page, then they wont be a header
                            header = lines[line_index - 1].replace("<header>", "").replace("</header>", "")
                        else:
                            header = ""
                        list_pattern = re.compile(r'<list>(.*?)(?:</list>|$)',
                                                  re.DOTALL)  ## Grab all list contents within the list xml tags
                        list_match = re.search(list_pattern, line)
                        list_ = list_match.group(1)
                        list_lines = list_.split("\n")

                        curr_chunk = []
                        words = len(re.findall(r'\w+', str(current_chunk)))  # start word count from any existing chunk
                        # Iterate through the items in the list
                        for lyst_item in list_lines:
                            curr_chunk.append(lyst_item)
                            words += len(re.findall(r'\w+', lyst_item))
                            if words >= max_words:  #
                                if [x for x in list_header_dict[title_ids] if chunk_counter == x]:
                                    list_header_dict[title_ids][chunk_counter].extend([header] + [list_])
                                else:
                                    list_header_dict[title_ids][chunk_counter] = [header] + [list_]
                                words = 0
                                list_chunk = "\n".join(curr_chunk)
                                if header:  # attach list header
                                    if current_chunk['content'] and current_chunk["content"][-1].strip().lower() == header.strip().lower():  # check if header is in the chunk and remove to avoid duplicacy of header in chunk
                                        current_chunk["content"].pop()
                                        # Append section content header to list
                                    if SECTION_HEADER and SECTION_HEADER.lower().strip() != header.lower().strip():
                                        if first_header_portion:
                                            first_header_portion = False
                                        else:
                                            current_chunk["content"].insert(0, SECTION_HEADER.strip())

                                    current_chunk["content"].extend([header.strip() + ':' if not header.strip().endswith(
                                        ':') else header.strip()] + [list_chunk])
                                    title_chunks.append(current_chunk)

                                else:
                                    if SECTION_HEADER:
                                        if first_header_portion:
                                            first_header_portion = False
                                        else:
                                            current_chunk["content"].insert(0, SECTION_HEADER.strip())

                                    current_chunk["content"].extend([list_chunk])
                                    title_chunks.append(current_chunk)
                                chunk_header_mapping[title_ids][chunk_counter] = lines
                                chunk_counter += 1
                                num_words = 0
                                current_chunk = {"content": [], "metadata": {}}
                                curr_chunk = []
                        if curr_chunk and lines.index(line) == len(
                                lines) - 1:  # if list chunk still remaining and list is last item in page append as last chunk
                            list_chunk = "\n".join(curr_chunk)
                            if [x for x in list_header_dict[title_ids] if chunk_counter == x]:
                                list_header_dict[title_ids][chunk_counter].extend([header] + [list_])
                            else:
                                list_header_dict[title_ids][chunk_counter] = [header] + [list_]
                            if header:
                                # Check if current_chunk["content"] is not empty before accessing its last element
                                if current_chunk["content"] and current_chunk["content"][-1].strip().lower() == header.strip().lower():
                                    current_chunk["content"].pop()
                                if SECTION_HEADER and SECTION_HEADER.lower().strip() != header.lower().strip():
                                    if first_header_portion:
                                        first_header_portion = False
                                    else:
                                        current_chunk["content"].insert(0, SECTION_HEADER.strip())
                                current_chunk["content"].extend(
                                    [header.strip() + ':' if not header.strip().endswith(':') else header.strip()] + [
                                        list_chunk])
                                title_chunks.append(current_chunk)
                            else:
                                if SECTION_HEADER:
                                    if first_header_portion:
                                        first_header_portion = False
                                    else:
                                        current_chunk["content"].insert(0, SECTION_HEADER.strip())
                                current_chunk["content"].extend([list_chunk])
                                title_chunks.append(current_chunk)
                            chunk_header_mapping[title_ids][chunk_counter] = lines
                            chunk_counter += 1
                            num_words = 0
                            current_chunk = {"content": [], "metadata": {}}
                        elif curr_chunk and lines.index(line) != len(
                                lines) - 1:  # if list is not last item in page and max word threshold is not reached, send to next loop
                            list_chunk = "\n".join(curr_chunk)
                            if [x for x in list_header_dict[title_ids] if chunk_counter == x]:
                                list_header_dict[title_ids][chunk_counter].extend([header] + [list_])
                            else:
                                list_header_dict[title_ids][chunk_counter] = [header] + [list_]
                            if header:
                                if current_chunk["content"] and current_chunk["content"][-1].strip().lower() == header.strip().lower():
                                    current_chunk["content"].pop()
                                current_chunk["content"].extend(
                                    [header.strip() + ':' if not header.strip().endswith(':') else header.strip()] + [
                                        list_chunk])
                            else:
                                current_chunk["content"].extend([list_chunk])
                            num_words = words

            if current_chunk["content"] and "".join(current_chunk["content"]).strip() != SECTION_HEADER and "".join(current_chunk["content"]).strip() != TITLES:
                if SECTION_HEADER:
                    if first_header_portion:
                        first_header_portion = False
                    else:
                        current_chunk["content"].insert(0, SECTION_HEADER.strip())
                title_chunks.append(current_chunk)
                chunk_header_mapping[title_ids][chunk_counter] = lines
                current_chunk = {"content": [], "metadata": {}}
                chunk_counter += 1
        if current_chunk["content"]:
            title_chunks.append(current_chunk)
            chunk_header_mapping[title_ids][chunk_counter] = lines
        chunks[title_ids] = title_chunks

    # List of title header sections document was split into
    for x in chunk_header_mapping:
        if chunk_header_mapping[x]:
            try:
                title_pattern = re.compile(r'<title>(.*?)(?:</title>|$)', re.DOTALL)
                title_match = re.search(title_pattern, chunk_header_mapping[x][0][0])
                title_ = title_match.group(1) if title_match else ""
            except:
                continue

    with open(f"/tmp/{doc_id}.json", "w") as f:
        json.dump(chunk_header_mapping, f)
    s3.upload_file(f"/tmp/{doc_id}.json", BUCKET, f"chunked_jsons/{doc_id}.json")
    os.remove(f"/tmp/{doc_id}.json")

    doc = {
        'chunks': chunks,
        'chunk_header_mapping': chunk_header_mapping,
        'table_header_dict': table_header_dict,
        'list_header_dict': list_header_dict,
        'doc_id': doc_id
    }

    return doc

def process_chunk(chunk, last_known_page):
    if isinstance(chunk, dict):
        passage_chunk = "\n".join(chunk['content'])
        page_number = int(chunk['metadata'].get('page', last_known_page)) if chunk['metadata'] else last_known_page
    elif isinstance(chunk, list):
        passage_chunk = "\n".join(chunk)
        page_number = last_known_page
    else:
        raise ValueError(f"Unexpected chunk type: {type(chunk)}")
    
    return passage_chunk.replace("<title>", "").replace("</title>", ""), page_number

def create_document(passage_chunk, table_context, table_uri, document_url, s3_uri, content_type, page_number):
    return Document(
        page_content=passage_chunk,
        metadata={
            'content_type': content_type,
            'table_context': table_context,
            'table_uri': table_uri,
            'source_url': document_url,
            's3_uri': s3_uri,
            'page_number': page_number,
        }
    )
    return 

# Main function to handle document processing and indexing synchronously
def create_documents(doc: dict, document_url: str, s3_uri: str, content_type: str):
    chunks = doc['chunks']
    list_header_dict = doc['list_header_dict']
    doc_id = doc['doc_id']

    documents = []
    last_known_page = 1
    for ids, chunkks in chunks.items():
        if not chunkks:
            continue
        for chunk_ids, chunk in enumerate(chunkks):
            try:
                # Process the chunk synchronously
                passage_chunk, last_known_page = process_chunk(chunk, last_known_page)
                passage_chunk, table_uri, table_context = extract_table_content(passage_chunk)
                passage_chunk = re.sub(r'<[^>]+>', '', passage_chunk)

                if passage_chunk.strip() or table_uri:
                    lists = "\n".join(list_header_dict.get(ids, {}).get(chunk_ids, []))
                    # Create the document
                    document = create_document(passage_chunk, table_context, table_uri, document_url, s3_uri, content_type, last_known_page)
                    documents.append(document)
            except Exception as e:
                print(f"Error processing chunk: {e}")

    return documents


def parse_s3_uri(s3_uri):
    # Ensure the URI starts with "s3://"
    if not s3_uri.startswith("s3://"):
        raise ValueError("Invalid S3 URI")
    
    # Remove the "s3://" prefix
    s3_path = s3_uri[5:]
    
    # Split the path into bucket and key
    bucket_name, *key_parts = s3_path.split("/", 1)
    file_key = key_parts[0] if key_parts else ""
    
    return bucket_name, file_key

def create_documents_from_pdf(s3_uri, content_type, source_url):
    bucket_name, s3_file_path = parse_s3_uri(s3_uri)

    print(f"Processing {os.path.basename(s3_file_path)}")

    document, local_pdf_path = extract_textract_data(s3, s3_uri, bucket_name)

    header_split, page_mapping = process_document(document, local_pdf_path)

    doc_chunks = chunk_document(header_split, s3_file_path, bucket_name, page_mapping)

    return create_documents(doc_chunks, source_url, s3_uri, content_type)
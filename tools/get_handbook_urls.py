import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def save_urls(urls):
    """Save URLs to TXT file"""
    with open('./handbook_urls.txt', "w") as outfile:
        for url in list(urls):
            outfile.write(url + "\n")

def get_handbook_urls():
    # URL of the webpage
    url = "https://www.boe.ca.gov/proptaxes/ahcont.htm"

    # Fetch the webpage content
    response = requests.get(url)
    response.raise_for_status()  # Raise an exception for HTTP errors

    # Parse the HTML content using BeautifulSoup
    soup = BeautifulSoup(response.text, 'html.parser')

    # Locate the Table of Contents section
    toc_section = soup.find('h2', string='Table of Contents')
    urls = []

    if toc_section:
        # Find the <ul> directly following the Table of Contents <h2>
        toc_list = toc_section.find_next('ul')
        if toc_list:
            # Extract URLs from the list
            for a_tag in toc_list.find_all('a', href=True):
                full_url = urljoin(url, a_tag['href'])
                urls.append(full_url)

    save_urls(urls)

get_handbook_urls()
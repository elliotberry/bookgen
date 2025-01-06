# bookjen

Martin Shkreli's million-peso idea.

**Bookjen** is a Node.js script that generates a book based on a specified genre, number of chapters, and pages per chapter. It uses an AI language model to generate summaries and content for each chapter and page.


## Features

- Generates a book summary, chapter summaries, and individual page content.
- Filters out unwanted headlines (e.g., "chapter," "page") from the content.
- Saves progress during execution to allow resumption if interrupted.
- Outputs the final book in both JSON and plain text formats.

## Prerequisites

1. **Node.js** (v16 or newer)
2. **NPM or Yarn**
3. A `.env` file configured with required API keys for the `askOpenRouter` function.

## Installation

1. Clone the repository or download the script.
2. Install dependencies:
   
   ```
   npm install
   ```
3.	Ensure the required .env file exists with appropriate configuration. See example.env for reference.

## Usage

```
node bookjen.js [genre/description] [chapters] [pages]

```
## Arguments
* [genre]: The genre of the book (e.g., “fantasy,” “romance”).
* [numChapters]: Number of chapters in the book (integer).
* [pagesPerChapter]: Number of pages per chapter (integer).
* [llmModel]: The language model to use (default: sao10k/l3.3-euryale-70b).

## Outputs
1. Progress File:
Location: `./output/<filename>.json`. Contains detailed summaries and content for all chapters and pages.

2. Final Book File: Location: `./output/<filename>.txt`. Plain text file with the book content.

## Key Functions
* **removeHeadlinesFromPage(page):** Removes unwanted lines (e.g., headers like “chapter” or “page”) from a page’s content.
* **loadProgress(filePath):** Loads progress from a saved file if available.
* **saveProgress(progress, filePath):** Saves the current state to allow resumption.
* **outputBook(progress, filePath):** Compiles and writes the final book to a text file.

## Notes
* Generated filenames are sanitized and include the genre, chapter count, page count, and model name for easy identification.

## Troubleshooting
* Invalid Arguments: Ensure all required arguments are provided and valid.
* API Errors: Verify the .env configuration and ensure the API key is valid.
* File Save Errors: Ensure the ./output directory can be created.

## Todo

Better summarizing previous chapters/pages/etc so llm can pickup on shit. 

Automatically pulling models from openrouter api, and using it to, say, populate a select.
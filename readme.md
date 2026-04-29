# 🪢 Manuscript Forge

Manuscript Forge is a static, browser-only website that converts manuscripts into EPUB files. It supports Markdown, plain text, DOCX, and optional custom cover artwork.

Website: https://angzeli.github.io/manuscript_forge/

## ✨ Features

- Convert `.md`, `.markdown`, `.txt`, and `.docx` files to `.epub`.
- Choose a custom cover from JPG, PNG, WebP, GIF, or PDF.
- PDF covers use the first page as the EPUB cover image.
- If no cover is chosen, the app generates a default cover from the book title and author.
- Runs entirely in the browser, so files are not uploaded to a server.
- Works as a static GitHub Pages site.

## 🚀 Usage

1. Open `index.html` in a browser.
2. Choose or drag in a manuscript file.
3. Optionally choose a cover file.
4. Fill in the title, author, and language fields.
5. Click **Convert to EPUB**.

## 📦 Browser Libraries

The page loads these libraries from CDNs:

- JSZip for EPUB packaging.
- Marked for Markdown parsing.
- Mammoth for DOCX conversion.
- PDF.js for PDF cover rendering.

Because these libraries are loaded from CDNs, users need an internet connection when opening the page.

## 🔒 Privacy

All conversion work happens locally in the visitor's browser. Manuscript files and cover files are not sent to a backend server by this project.

## 👋 Author

Made by Angze "Squiddy" Li.

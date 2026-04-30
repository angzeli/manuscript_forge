    const fileInput = document.getElementById("file-input");
    const dropzone = document.getElementById("dropzone");
    const fileCard = document.getElementById("file-card");
    const fileName = document.getElementById("file-name");
    const fileMeta = document.getElementById("file-meta");
    const coverInput = document.getElementById("cover-input");
    const coverPreview = document.getElementById("cover-preview");
    const coverTitle = document.getElementById("cover-title");
    const coverHelp = document.getElementById("cover-help");
    const clearCoverButton = document.getElementById("clear-cover-button");
    const clearButton = document.getElementById("clear-button");
    const convertButton = document.getElementById("convert-button");
    const sampleButton = document.getElementById("sample-button");
    const statusEl = document.getElementById("status");
    const preview = document.getElementById("preview");
    const previewState = document.getElementById("preview-state");
    const titleInput = document.getElementById("book-title");
    const authorInput = document.getElementById("book-author");
    const languageInput = document.getElementById("book-language");

    let selectedFile = null;
    let selectedCoverFile = null;
    let coverPreviewUrl = "";
    let sampleMarkdown = "";
    const supportedExtensions = ["md", "markdown", "txt", "docx"];
    const supportedCoverTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

    if (window.pdfjsLib) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
    }

    const previewCss = `
      body {
        max-width: 700px;
        margin: 0 auto;
        padding: 32px 26px;
        color: #211c18;
        font-family: Georgia, serif;
        line-height: 1.65;
      }
      h1, h2, h3 { line-height: 1.15; }
      img { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
      td, th { border: 1px solid #ddd; padding: 8px; }
      blockquote { margin-left: 0; padding-left: 18px; border-left: 4px solid #c3542d; color: #71665f; }
      code { background: #f5eadc; padding: 0.1em 0.32em; border-radius: 0.3em; }
      pre code { display: block; padding: 1em; overflow-x: auto; }
    `;

    const epubCss = `
      body {
        color: #211c18;
        font-family: Georgia, serif;
        line-height: 1.65;
        margin: 5%;
      }
      h1, h2, h3, h4 {
        line-height: 1.18;
        page-break-after: avoid;
      }
      p, li {
        orphans: 2;
        widows: 2;
      }
      img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 1.4em auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin: 1.25em 0;
      }
      td, th {
        border: 1px solid #d8cabb;
        padding: 0.45em 0.6em;
      }
      blockquote {
        margin: 1.4em 0;
        padding-left: 1em;
        border-left: 0.25em solid #c3542d;
        color: #71665f;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background: #f5eadc;
        padding: 0.08em 0.26em;
      }
      pre code {
        display: block;
        padding: 1em;
        white-space: pre-wrap;
      }
    `;

    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        sampleMarkdown = "";
        setFile(fileInput.files[0]);
      }
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropzone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone.classList.remove("is-dragging");
      });
    });

    dropzone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) {
        sampleMarkdown = "";
        setFile(file);
      }
    });

    clearButton.addEventListener("click", () => {
      selectedFile = null;
      sampleMarkdown = "";
      fileInput.value = "";
      fileCard.classList.remove("is-visible");
      convertButton.disabled = true;
      preview.removeAttribute("srcdoc");
      previewState.textContent = "Waiting";
      setStatus("Choose a file to begin.");
    });

    coverInput.addEventListener("change", () => {
      if (coverInput.files && coverInput.files[0]) {
        setCoverFile(coverInput.files[0]);
      }
    });

    clearCoverButton.addEventListener("click", () => {
      clearCoverFile();
      setStatus("Default cover will be used.");
    });

    sampleButton.addEventListener("click", () => {
      sampleMarkdown = `# A Small EPUB Sample

This sample shows **Markdown conversion** in action. Replace it with your own \`.md\`, \`.txt\`, or \`.docx\` file when you are ready.

## What works

- Headings become proper HTML headings.
- Lists, links, quotes, and code blocks are preserved.
- The EPUB is assembled directly inside your browser.

> Your manuscript never needs to leave your computer.

## Tiny code sample

\`\`\`js
console.log("Hello, EPUB reader.");
\`\`\`
`;
      selectedFile = new File([sampleMarkdown], "sample-book.md", { type: "text/markdown" });
      setFile(selectedFile);
      titleInput.value = "A Small EPUB Sample";
      authorInput.value = "Manuscript Forge";
      renderPreview(markdownToHtml(sampleMarkdown));
      previewState.textContent = "Sample loaded";
      setStatus("Sample Markdown loaded. Click \"Convert to EPUB\" to download it.");
    });

    convertButton.addEventListener("click", async () => {
      if (!selectedFile) {
        return;
      }

      convertButton.disabled = true;
      setStatus("Reading your manuscript...");

      try {
        const source = await convertSourceToHtml(selectedFile);
        const inferredTitle = inferTitle(source.html) || stripExtension(selectedFile.name);
        const bookTitle = cleanText(titleInput.value.trim() || inferredTitle || "Untitled Book");
        const author = cleanText(authorInput.value.trim() || "Unknown Author");
        const language = cleanText(languageInput.value.trim() || "en");

        titleInput.value = bookTitle;
        authorInput.value = author;
        languageInput.value = language;

        renderPreview(source.html);
        setStatus("Packaging EPUB files...");

        const epubBlob = await buildEpub({
          html: source.html,
          title: bookTitle,
          author,
          language,
          sourceName: selectedFile.name,
          coverFile: selectedCoverFile
        });

        const outputName = `${slugify(bookTitle) || "converted-book"}.epub`;
        downloadBlob(epubBlob, outputName);

        const messageParts = [`<strong>Finished.</strong> Downloaded ${escapeHtml(outputName)}.`];
        if (source.warnings.length) {
          messageParts.push(source.warnings.map(escapeHtml).join(" "));
        }
        setStatus(messageParts.join(" "));
        previewState.textContent = "Converted";
      } catch (error) {
        console.error(error);
        setStatus(`<strong>Could not convert this file.</strong> ${escapeHtml(error.message || "Please try another Markdown or DOCX file.")}`);
      } finally {
        convertButton.disabled = false;
      }
    });

    function setFile(file) {
      const extension = getExtension(file.name);
      if (!supportedExtensions.includes(extension)) {
        setStatus("<strong>Unsupported file type.</strong> Please choose a `.md`, `.markdown`, `.txt`, or `.docx` file.");
        return;
      }

      selectedFile = file;
      fileName.textContent = file.name;
      fileMeta.textContent = `${extension.toUpperCase()} · ${formatBytes(file.size)}`;
      fileCard.classList.add("is-visible");
      convertButton.disabled = false;
      previewState.textContent = "Ready";
      setStatus("Ready to convert.");

      if (!titleInput.value.trim()) {
        titleInput.value = cleanText(stripExtension(file.name));
      }
    }

    async function setCoverFile(file) {
      if (!isSupportedCoverFile(file)) {
        clearCoverFile();
        setStatus("<strong>Unsupported cover type.</strong> Please choose a JPG, PNG, WebP, GIF, or PDF file.");
        return;
      }

      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      selectedCoverFile = file;
      coverTitle.textContent = file.name;

      try {
        if (isPdfFile(file)) {
          setStatus("Rendering first PDF page for the cover preview...");
          const pdfCover = await renderPdfCover(file, 420);
          coverPreviewUrl = URL.createObjectURL(pdfCover.blob);
          coverPreview.innerHTML = `<img src="${coverPreviewUrl}" alt="">`;
          coverHelp.textContent = `PDF cover selected · first page will be used · ${formatBytes(file.size)}`;
        } else {
          coverPreviewUrl = URL.createObjectURL(file);
          coverPreview.innerHTML = `<img src="${coverPreviewUrl}" alt="">`;
          coverHelp.textContent = `${file.type.replace("image/", "").toUpperCase()} cover selected · ${formatBytes(file.size)}`;
        }

        setStatus("Custom cover selected.");
      } catch (error) {
        console.error(error);
        clearCoverFile();
        setStatus(`<strong>Could not read that PDF cover.</strong> ${escapeHtml(error.message || "Please try another cover file.")}`);
      }
    }

    function clearCoverFile() {
      selectedCoverFile = null;
      coverInput.value = "";

      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
        coverPreviewUrl = "";
      }

      coverPreview.innerHTML = "Default<br>Cover";
      coverTitle.textContent = "Cover image";
      coverHelp.textContent = "Choose a JPG, PNG, WebP, GIF, or PDF cover. PDFs use the first page. If you skip this, a default cover will be generated.";
    }

    function isSupportedCoverFile(file) {
      return supportedCoverTypes.includes(file.type) || (isPdfFile(file) && getExtension(file.name) === "pdf");
    }

    function isPdfFile(file) {
      return file.type === "application/pdf" || getExtension(file.name) === "pdf";
    }

    async function convertSourceToHtml(file) {
      const extension = getExtension(file.name);
      const warnings = [];

      if (extension === "docx") {
        if (!window.mammoth) {
          throw new Error("The DOCX converter library did not load. Check your internet connection and refresh.");
        }

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            convertImage: mammoth.images.imgElement(async (image) => {
              const base64 = await image.read("base64");
              return { src: `data:${image.contentType};base64,${base64}` };
            })
          }
        );

        result.messages.forEach((message) => {
          if (message.message) {
            warnings.push(`DOCX note: ${message.message}`);
          }
        });

        return { html: result.value || "<p></p>", warnings };
      }

      const text = sampleMarkdown || await file.text();
      if (extension === "txt") {
        return { html: plainTextToHtml(text), warnings };
      }

      return { html: markdownToHtml(text, warnings), warnings };
    }

    async function buildEpub({ html, title, author, language, sourceName, coverFile }) {
      if (!window.JSZip) {
        throw new Error("The EPUB packaging library did not load. Check your internet connection and refresh.");
      }

      const zip = new JSZip();
      const bookId = `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : fallbackUuid()}`;
      const modified = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      const images = [];
      const bodyHtml = await normalizeHtmlForEpub(html, zip, images);
      const hasHeading = /^\s*<h1[\s>]/i.test(bodyHtml);
      const chapterBody = hasHeading ? bodyHtml : `<h1>${escapeXml(title)}</h1>\n${bodyHtml}`;
      const cover = await addCoverToEpub(zip, { title, author, coverFile });

      zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
      zip.file("META-INF/container.xml", xml`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

      zip.file("OEBPS/style.css", epubCss.trim());
      zip.file("OEBPS/nav.xhtml", xml`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(language)}" xml:lang="${escapeXml(language)}">
  <head>
    <title>${escapeXml(title)} Navigation</title>
  </head>
  <body>
    <nav epub:type="toc" id="toc">
      <h1>${escapeXml(title)}</h1>
      <ol>
        <li><a href="cover.xhtml">Cover</a></li>
        <li><a href="chapter.xhtml">${escapeXml(title)}</a></li>
      </ol>
    </nav>
  </body>
</html>`);

      zip.file("OEBPS/cover.xhtml", xml`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(language)}" xml:lang="${escapeXml(language)}">
  <head>
    <title>${escapeXml(title)} Cover</title>
    <style>
      body { margin: 0; padding: 0; text-align: center; }
      img { display: block; width: 100%; max-height: 100vh; object-fit: contain; }
    </style>
  </head>
  <body>
    <section epub:type="cover">
      <img src="${escapeXml(cover.href)}" alt="${escapeXml(title)} cover"/>
    </section>
  </body>
</html>`);

      zip.file("OEBPS/chapter.xhtml", xml`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="${escapeXml(language)}" xml:lang="${escapeXml(language)}">
  <head>
    <title>${escapeXml(title)}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
  </head>
  <body>
    <section epub:type="chapter" aria-label="${escapeXml(title)}">
      ${chapterBody}
    </section>
  </body>
</html>`);

      const manifestImages = images.map((image, index) => {
        return `<item id="image-${index + 1}" href="${escapeXml(image.href)}" media-type="${escapeXml(image.mediaType)}"/>`;
      }).join("\n    ");

      zip.file("OEBPS/content.opf", xml`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="${escapeXml(language)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${escapeXml(bookId)}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>${escapeXml(language)}</dc:language>
    <dc:source>${escapeXml(sourceName)}</dc:source>
    <meta name="cover" content="cover-image"/>
    <meta property="dcterms:modified">${escapeXml(modified)}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-image" href="${escapeXml(cover.href)}" media-type="${escapeXml(cover.mediaType)}" properties="cover-image"/>
    <item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>
    ${manifestImages}
  </manifest>
  <spine>
    <itemref idref="cover-page" linear="no"/>
    <itemref idref="chapter"/>
  </spine>
</package>`);

      return zip.generateAsync({
        type: "blob",
        mimeType: "application/epub+zip",
        compression: "DEFLATE"
      });
    }

    async function addCoverToEpub(zip, { title, author, coverFile }) {
      if (coverFile) {
        if (isPdfFile(coverFile)) {
          const pdfCover = await renderPdfCover(coverFile, 1200);
          const href = "images/cover.jpg";
          zip.file(`OEBPS/${href}`, await pdfCover.blob.arrayBuffer());
          return { href, mediaType: "image/jpeg" };
        }

        const extension = extensionFromMime(coverFile.type);
        const href = `images/cover.${extension}`;
        const bytes = await coverFile.arrayBuffer();
        zip.file(`OEBPS/${href}`, bytes);
        return { href, mediaType: coverFile.type };
      }

      const href = "images/default-cover.svg";
      zip.file(`OEBPS/${href}`, defaultCoverSvg(title, author));
      return { href, mediaType: "image/svg+xml" };
    }

    async function renderPdfCover(file, targetWidth) {
      if (!window.pdfjsLib) {
        throw new Error("The PDF cover library did not load. Check your internet connection and refresh.");
      }

      const bytes = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = targetWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });

      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
      return { blob, width: canvas.width, height: canvas.height };
    }

    function canvasToBlob(canvas, type, quality) {
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("The PDF cover could not be rendered."));
          }
        }, type, quality);
      });
    }

    function defaultCoverSvg(title, author) {
      const titleLines = wrapTextForCover(title || "Untitled Book", 16).slice(0, 4);
      const authorLine = author || "Unknown Author";
      const titleTspans = titleLines.map((line, index) => {
        const y = 390 + (index * 72);
        return `<tspan x="90" y="${y}">${escapeXml(line)}</tspan>`;
      }).join("");

      return xml`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800" viewBox="0 0 1200 1800" role="img" aria-label="${escapeXml(title)} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#8f371d"/>
      <stop offset="0.52" stop-color="#c3542d"/>
      <stop offset="1" stop-color="#e8b85a"/>
    </linearGradient>
    <radialGradient id="glow" cx="28%" cy="18%" r="72%">
      <stop offset="0" stop-color="#fffaf2" stop-opacity="0.46"/>
      <stop offset="1" stop-color="#fffaf2" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1800" fill="url(#bg)"/>
  <rect width="1200" height="1800" fill="url(#glow)"/>
  <circle cx="970" cy="230" r="380" fill="#7f9a80" opacity="0.24"/>
  <circle cx="170" cy="1560" r="430" fill="#211c18" opacity="0.18"/>
  <path d="M120 235H1080M120 1440H1080" stroke="#fffaf2" stroke-opacity="0.42" stroke-width="4"/>
  <text x="90" y="170" fill="#fffaf2" fill-opacity="0.82" font-family="Georgia, serif" font-size="42" letter-spacing="9">EPUB EDITION</text>
  <text fill="#fffaf2" font-family="Georgia, serif" font-size="76" font-weight="700" letter-spacing="-2">${titleTspans}</text>
  <text x="90" y="1518" fill="#fffaf2" fill-opacity="0.9" font-family="Georgia, serif" font-size="48">${escapeXml(authorLine)}</text>
  <text x="90" y="1612" fill="#fffaf2" fill-opacity="0.62" font-family="Georgia, serif" font-size="30" letter-spacing="7">MANUSCRIPT FORGE</text>
</svg>`;
    }

    function wrapTextForCover(text, maxLength) {
      const words = cleanText(text).split(" ");
      const lines = [];
      let line = "";

      words.forEach((word) => {
        const nextLine = line ? `${line} ${word}` : word;
        if (nextLine.length > maxLength && line) {
          lines.push(line);
          line = word;
        } else {
          line = nextLine;
        }
      });

      if (line) {
        lines.push(line);
      }

      return lines.length ? lines : ["Untitled Book"];
    }

    async function normalizeHtmlForEpub(html, zip, images) {
      const doc = document.implementation.createHTMLDocument("chapter");
      doc.body.innerHTML = html;

      doc.querySelectorAll("script, style, iframe, object, embed, form, input, button, textarea, select").forEach((node) => node.remove());

      doc.querySelectorAll("*").forEach((node) => {
        [...node.attributes].forEach((attribute) => {
          const name = attribute.name.toLowerCase();
          if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
            node.removeAttribute(attribute.name);
          }
        });
      });

      const imageNodes = [...doc.querySelectorAll("img")];
      for (let index = 0; index < imageNodes.length; index += 1) {
        const img = imageNodes[index];
        const src = img.getAttribute("src") || "";
        img.setAttribute("alt", img.getAttribute("alt") || "");

        if (src.startsWith("data:image/")) {
          const image = dataUriToBytes(src);
          const extension = extensionFromMime(image.mediaType);
          const href = `images/image-${images.length + 1}.${extension}`;
          zip.file(`OEBPS/${href}`, image.bytes);
          img.setAttribute("src", href);
          images.push({ href, mediaType: image.mediaType });
        }
      }

      doc.querySelectorAll("a").forEach((link) => {
        const href = link.getAttribute("href");
        if (!href) {
          link.removeAttribute("href");
        }
      });

      const serializer = new XMLSerializer();
      return [...doc.body.childNodes].map((node) => serializer.serializeToString(node)).join("\n").trim() || "<p></p>";
    }

    function renderPreview(html) {
      preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${previewCss}</style></head><body>${html}</body></html>`;
      previewState.textContent = "Previewing";
    }

    function dataUriToBytes(uri) {
      const match = uri.match(/^data:([^;,]+);base64,(.*)$/);
      if (!match) {
        throw new Error("An embedded image could not be read.");
      }

      const mediaType = match[1];
      const binary = atob(match[2]);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return { mediaType, bytes };
    }

    function extensionFromMime(mediaType) {
      const map = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/svg+xml": "svg",
        "image/webp": "webp"
      };
      return map[mediaType] || "bin";
    }

    function simpleMarkdownToHtml(markdown) {
      return markdown
        .split(/\n{2,}/)
        .map((block) => {
          const trimmed = block.trim();
          if (!trimmed) {
            return "";
          }
          if (trimmed.startsWith("# ")) {
            return `<h1>${escapeHtml(trimmed.slice(2))}</h1>`;
          }
          if (trimmed.startsWith("## ")) {
            return `<h2>${escapeHtml(trimmed.slice(3))}</h2>`;
          }
          if (trimmed.startsWith("### ")) {
            return `<h3>${escapeHtml(trimmed.slice(4))}</h3>`;
          }
          return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br>")}</p>`;
        })
        .join("\n");
    }

    function markdownToHtml(markdown, warnings = []) {
      if (window.marked) {
        marked.setOptions({ gfm: true, breaks: false });
        return marked.parse(markdown);
      }

      warnings.push("Markdown parser library did not load, so a simple fallback parser was used.");
      return simpleMarkdownToHtml(markdown);
    }

    function plainTextToHtml(text) {
      const paragraphs = text
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`);

      return paragraphs.join("\n") || "<p></p>";
    }

    function inferTitle(html) {
      const doc = document.implementation.createHTMLDocument("");
      doc.body.innerHTML = html;
      const heading = doc.querySelector("h1, h2");
      return heading ? cleanText(heading.textContent) : "";
    }

    function cleanText(value) {
      return value.replace(/\s+/g, " ").trim();
    }

    function stripExtension(name) {
      return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
    }

    function getExtension(name) {
      return (name.split(".").pop() || "").toLowerCase();
    }

    function formatBytes(bytes) {
      if (bytes < 1024) {
        return `${bytes} bytes`;
      }
      if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
      }
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }

    function slugify(value) {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 72);
    }

    function downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1200);
    }

    function setStatus(message) {
      statusEl.innerHTML = message;
    }

    function escapeHtml(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    function escapeXml(value) {
      return escapeHtml(value);
    }

    function fallbackUuid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const random = Math.random() * 16 | 0;
        const value = char === "x" ? random : (random & 0x3 | 0x8);
        return value.toString(16);
      });
    }

    function xml(strings, ...values) {
      return strings.reduce((result, string, index) => result + string + (values[index] || ""), "").trim();
    }

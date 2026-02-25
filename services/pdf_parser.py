"""
LexTimeline - PDF Parser Service
Uses PyMuPDF (fitz) for high-performance, layout-aware text extraction.
Returns per-page text with page numbers preserved.
"""

import fitz  # PyMuPDF
import logging
from typing import List, Tuple

logger = logging.getLogger(__name__)


class PDFParsingError(Exception):
    """Raised when the PDF cannot be parsed or yields no extractable text."""
    pass


def extract_text_by_page(file_bytes: bytes) -> List[Tuple[int, str]]:
    """
    Extracts text from a PDF file supplied as raw bytes.

    Iterates through every page using PyMuPDF's layout-preserving extraction
    mode ("blocks") to maintain reading order and paragraph structure. Pages
    that yield no text (e.g. scanned image pages) are skipped with a warning.

    Args:
        file_bytes: The raw bytes of the PDF file received from the upload.

    Returns:
        A list of (page_number, page_text) tuples, where page_number is
        1-indexed and page_text is the cleaned text content of that page.

    Raises:
        PDFParsingError: If the bytes are not a valid PDF or if no text can
                         be extracted from any page (e.g. fully scanned doc).
    """
    if not file_bytes:
        raise PDFParsingError("Received empty file bytes. Cannot parse PDF.")

    try:
        # Open from memory stream — avoids writing a temp file to disk.
        pdf_document = fitz.open(stream=file_bytes, filetype="pdf")
    except fitz.FileDataError as exc:
        raise PDFParsingError(f"Invalid or corrupted PDF file: {exc}") from exc

    total_pages = len(pdf_document)
    logger.info("PDF opened successfully. Total pages: %d", total_pages)

    pages_with_text: List[Tuple[int, str]] = []

    for page_index in range(total_pages):
        page_number = page_index + 1  # Convert to 1-indexed
        page = pdf_document[page_index]

        # Extract using "blocks" for best reading-order accuracy.
        # Each block is a dict; "lines" within contain "spans" with text.
        page_text = _extract_page_text(page, page_number)

        if page_text.strip():
            pages_with_text.append((page_number, page_text))
        else:
            logger.warning(
                "Page %d/%d yielded no extractable text. "
                "It may be a scanned image — consider adding OCR support.",
                page_number,
                total_pages,
            )

    pdf_document.close()

    if not pages_with_text:
        raise PDFParsingError(
            "No text could be extracted from any page in the document. "
            "The PDF may consist entirely of scanned images. "
            "Please use an OCR-enabled PDF or a text-based PDF."
        )

    logger.info(
        "Extraction complete. %d/%d pages contained text.",
        len(pages_with_text),
        total_pages,
    )
    return pages_with_text


def _extract_page_text(page: fitz.Page, page_number: int) -> str:
    """
    Extracts and cleans text from a single PyMuPDF Page object.

    Uses the 'dict' extraction mode (block → line → span) to produce
    well-ordered text, then applies lightweight cleaning heuristics:
    - Strips excessive blank lines.
    - Preserves paragraph breaks (double newlines).
    - Adds a page header comment for downstream context.

    Args:
        page:        A fitz.Page object.
        page_number: The 1-indexed page number for the header comment.

    Returns:
        A cleaned string of text for the page, prefixed with a page marker.
    """
    text_blocks: List[str] = []

    try:
        blocks = page.get_text("blocks")  # List of (x0, y0, x1, y1, text, block_no, block_type)
        # Sort by vertical position (y0), then horizontal (x0) for reading order.
        blocks_sorted = sorted(blocks, key=lambda b: (b[1], b[0]))

        for block in blocks_sorted:
            # block[6] == 0 means text block (not image block)
            if block[6] == 0:
                raw_text = block[4]
                cleaned = _clean_block_text(raw_text)
                if cleaned:
                    text_blocks.append(cleaned)

    except Exception as exc:  # noqa: BLE001
        logger.error("Error extracting text from page %d: %s", page_number, exc)
        # Fallback to simple text extraction.
        text_blocks = [page.get_text("text")]

    page_text = "\n\n".join(text_blocks)
    # Prepend a clear page marker so the LLM can track source pages.
    return f"[SAYFA {page_number}]\n{page_text}"


def _clean_block_text(text: str) -> str:
    """
    Applies basic cleaning to a raw text block from PyMuPDF.

    - Removes lines that are only whitespace.
    - Collapses 3+ consecutive newlines into 2.
    - Strips leading/trailing whitespace.

    Args:
        text: Raw text block string.

    Returns:
        Cleaned text string.
    """
    # Remove lines that are entirely whitespace.
    lines = [line for line in text.splitlines() if line.strip()]
    cleaned = "\n".join(lines)
    return cleaned.strip()


def build_prompt_text(pages: List[Tuple[int, str]], max_chars: int = 120_000) -> str:
    """
    Concatenates per-page text into a single string suitable for the LLM prompt.

    Applies a character cap (`max_chars`) to avoid exceeding model context
    windows. If the document is truncated, a warning marker is appended so the
    LLM is aware the document was cut off.

    Args:
        pages:     Output of `extract_text_by_page`.
        max_chars: Maximum total characters to include. Default 120,000
                   (~30,000 tokens) — safe for gpt-4.1's 128k context.

    Returns:
        A single string of all page text, potentially truncated.
    """
    combined_parts = [text for _, text in pages]
    full_text = "\n\n".join(combined_parts)

    if len(full_text) > max_chars:
        logger.warning(
            "Document text (%d chars) exceeds max_chars limit (%d). Truncating.",
            len(full_text),
            max_chars,
        )
        full_text = full_text[:max_chars] + (
            "\n\n[UYARI: Belge içeriği bağlam penceresi sınırı nedeniyle kesildi. "
            "Yukarıdaki tüm bilgiler analiz edildi; geri kalan sayfalar dahil edilmedi.]"
        )

    return full_text



# -*- coding: utf-8 -*-
"""Extract text from PDF and output to file."""
import sys

def main():
    pdf_path = r"z:\Document\Untitled_20260130_103030.pdf"
    out_path = r"C:\Users\kyj\eclipse-workspace5.0\waterb_frontend\scripts\extracted_text.txt"
    try:
        try:
            from pypdf import PdfReader
        except ImportError:
            from PyPDF2 import PdfReader
        reader = PdfReader(pdf_path)
        lines = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                lines.append(f"--- PAGE {i+1} ---")
                lines.append(text)
                lines.append("")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"OK:{len(reader.pages)}")
    except Exception as e:
        print(f"ERROR:{e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

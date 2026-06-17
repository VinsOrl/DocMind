import fitz  # PyMuPDF


class PDFParser:
    def extract_text(self, file_path: str) -> dict:
        """
        Returns:
          {
            "full_text": str,
            "pages": [{"page_num": 1, "text": "..."}],
            "page_count": int
          }
        """
        doc = fitz.open(file_path)
        pages = []
        full_text = ""

        for page_num, page in enumerate(doc, start=1):
            text = page.get_text("text")
            pages.append({"page_num": page_num, "text": text})
            full_text += f"\n[PAGE {page_num}]\n{text}"

        doc.close()
        return {
            "full_text": full_text,
            "pages": pages,
            "page_count": len(pages),
        }


pdf_parser = PDFParser()

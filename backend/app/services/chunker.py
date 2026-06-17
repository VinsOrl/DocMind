from langchain_text_splitters import RecursiveCharacterTextSplitter


class TextChunker:
    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def chunk_pages(self, pages: list[dict]) -> list[dict]:
        """
        Input:  [{"page_num": 1, "text": "..."}]
        Output: [{"chunk_idx": 0, "text": "...", "page": 1}]
        """
        chunks = []
        chunk_idx = 0
        for page in pages:
            page_chunks = self.splitter.split_text(page["text"])
            for chunk_text in page_chunks:
                if chunk_text.strip():
                    chunks.append(
                        {
                            "chunk_idx": chunk_idx,
                            "text": chunk_text.strip(),
                            "page": page["page_num"],
                        }
                    )
                    chunk_idx += 1
        return chunks

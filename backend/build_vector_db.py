import json

from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

documents = []

# Load dataset
with open("dataset/legal_dataset.jsonl", "r", encoding="utf-8") as f:

    for line in f:

        data = json.loads(line)

        text = f"""
        Category: {data.get("category")}

        User Queries:
        {", ".join(data.get("user_queries", []))}

        Legal Context:
        {json.dumps(data.get("legal_context", {}), ensure_ascii=False)}
        """

        documents.append(
            Document(page_content=text)
        )

print(f"Loaded {len(documents)} documents")

# Embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Create vector DB
db = FAISS.from_documents(documents, embeddings)

# Save locally
db.save_local("faiss_index")

print("✅ FAISS Vector Database Created Successfully")
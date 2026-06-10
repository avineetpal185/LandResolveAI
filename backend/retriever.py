from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

# Load embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Load FAISS vector database
try:
    db = FAISS.load_local(
        "faiss_index",
        embeddings,
        allow_dangerous_deserialization=True
    )
    print("✅ FAISS index loaded successfully")
except Exception as e:
    print(f"⚠️ FAISS index not found or failed to load: {e}")
    db = None

def retrieve_context(query: str) -> str:
    if db is None:
        return ""
    try:
        docs = db.similarity_search(query, k=3)
        results = []
        for doc in docs:
            results.append(doc.page_content)
        return "\n\n".join(results)
    except Exception as e:
        print(f"⚠️ Retrieval error: {e}")
        return ""
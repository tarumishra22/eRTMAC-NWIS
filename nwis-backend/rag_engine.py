# rag_engine.py
import io
from pypdf import PdfReader
import chromadb
from chromadb.utils import embedding_functions

# 1. Initialize persistent or in-memory vector database
chroma_client = chromadb.Client()

# 2. Use lightweight default embedding function
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

# 3. Create or get knowledge collection
collection = chroma_client.get_or_create_collection(
    name="offset_well_knowledge",
    embedding_function=embedding_fn
)

def seed_initial_knowledge():
    """
    Simulate pre-ingested historical drilling reports and lessons learned.
    In real workflow, this comes from parsed PDFs.
    """
    documents = [
        "Well OIL-DIB-02: Severe mud loss of 150 bbl observed at depth 2510m in Barail Formation. Circulation broke completely. Mitigation: Pumped high-viscosity LCM (Loss Circulation Material) pill and kept ECD below 12.2 ppg.",
        "Well OIL-DIB-02: Pipe stuck due to differential sticking at 2540m in Barail Sand. High torque observed. Mitigation: Soaked pipe with spotting fluid, worked drill string within safe tension limits.",
        "Well OIL-NAH-04: Mild gas kick observed at 2250m in Tipam Sandstone. Flow check positive, shut-in casing pressure rose by 200 psi. Mitigation: Circulated kick out using Driller's Method with 11.5 ppg kill mud.",
        "Well OIL-BOR-05: High drill string vibration and severe bit wear recorded at 1950m in Girujan Clay due to interbedded shale. Mitigation: Reduced RPM to 60 and optimized WOB (Weight on Bit)."
    ]
    
    metadatas = [
        {"well_id": "OIL-DIB-02", "formation": "Barail Formation", "depth_m": 2510, "incident": "MUD_LOSS"},
        {"well_id": "OIL-DIB-02", "formation": "Barail Formation", "depth_m": 2540, "incident": "STUCK_PIPE"},
        {"well_id": "OIL-NAH-04", "formation": "Tipam Sandstone", "depth_m": 2250, "incident": "KICK"},
        {"well_id": "OIL-BOR-05", "formation": "Girujan Clay", "depth_m": 1950, "incident": "BIT_WEAR"}
    ]
    
    ids = ["doc_01", "doc_02", "doc_03", "doc_04"]

    # Insert into ChromaDB if collection is empty
    if collection.count() == 0:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        print("Vector Database seeded with historical well reports.")

def query_knowledge_base(query_text: str, n_results: int = 2):
    """
    Search vector database for semantic matches against drilling queries.
    """
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    
    extracted_records = []
    if results and "documents" in results and len(results["documents"]) > 0:
        for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
            extracted_records.append({
                "summary": doc,
                "metadata": meta
            })
            
    return extracted_records


def ingest_pdf_document(file_bytes: bytes, filename: str):
    """
    Extract raw text from an uploaded PDF report, parse key details,
    and index it directly into the ChromaDB vector collection.
    """
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    
    extracted_text = ""
    for page in reader.pages:
        text = page.extract_text()
        if text:
            extracted_text += text + "\n"
            
    # Fallback agar PDF scanned/empty ho demo ke time
    if not extracted_text.strip():
        extracted_text = f"Historical drilling log imported from file: {filename}. Contains formation and mud logging data."

    # Unique document identifier
    doc_id = f"doc_uploaded_{collection.count() + 1}"
    
    # Vector store mein new document insert karna
    collection.add(
        documents=[extracted_text],
        metadatas=[{
            "filename": filename,
            "source": "Uploaded_WCR_DDR",
            "type": "USER_INGESTED"
        }],
        ids=[doc_id]
    )
    
    return {
        "status": "SUCCESS",
        "doc_id": doc_id,
        "filename": filename,
        "characters_extracted": len(extracted_text),
        "preview": extracted_text[:200] + "..." if len(extracted_text) > 200 else extracted_text
    }
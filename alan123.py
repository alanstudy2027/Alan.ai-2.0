from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from mlx_lm import load, stream_generate
import json
import numpy as np
from sentence_transformers import SentenceTransformer
import time
import random
import re
import threading
import fitz  # PyMuPDF
import faiss
import os
import tempfile
import uuid

app = Flask(__name__)
CORS(app)

# Initialize models
model, tokenizer = load("mlx-community/Qwen3-4B-Instruct-2507-4bit")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Conversation storage with thread lock
conversation_lock = threading.Lock()
conversation_embeddings = []
conversation_messages = []

document_index = None
document_chunks = []
uploaded_documents = {}

def extract_text_from_pdf(file_path):
    """Extract text from PDF document"""
    text_list = []
    doc = fitz.open(file_path)
    for page in doc:
        text = page.get_text().strip()
        if text:
            text_list.append(text)
    return text_list

def create_vector_index(text_chunks):
    """Create FAISS index from text chunks"""
    embeddings = embedding_model.encode(text_chunks)
    embeddings = np.array(embeddings, dtype='float32')
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index, len(text_chunks)

@app.route('/api/upload', methods=['POST'])
def upload_document():
    """Handle document upload and processing"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    try:
        # Save the file temporarily
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in ['.pdf', '.docx', '.txt']:
            return jsonify({'error': 'Unsupported file type'}), 400
        
        # Create a temp file
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, f"doc_{uuid.uuid4()}{file_ext}")
        file.save(temp_path)
        
        # Process the document
        if file_ext == '.pdf':
            chunks = extract_text_from_pdf(temp_path)
        else:
            # For other file types you'd implement similar extractors
            with open(temp_path, 'r') as f:
                chunks = [f.read()]
        
        # Create vector index
        index, num_chunks = create_vector_index(chunks)
        
        # Store document info
        doc_id = str(uuid.uuid4())
        uploaded_documents[doc_id] = {
            'index': index,
            'chunks': chunks,
            'filename': file.filename,
            'path': temp_path
        }
        
        # Clean up
        os.remove(temp_path)
        
        return jsonify({
            'document': file.filename,
            'chunks': num_chunks,
            'doc_id': doc_id
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/rag', methods=['POST'])
def chat_with_document():
    """Handle RAG-based chat with uploaded document"""
    data = request.get_json()
    query = data.get('message', '').strip()
    doc_id = data.get('doc_id', '')
    
    if not query:
        return jsonify({'error': 'Empty query'}), 400
    
    if doc_id not in uploaded_documents:
        return jsonify({'error': 'Document not found'}), 404
    
    try:
        # Get document data
        doc_data = uploaded_documents[doc_id]
        index = doc_data['index']
        chunks = doc_data['chunks']
        
        # Search in vector DB
        query_vector = embedding_model.encode([query]).astype('float32')  # Fixed: changed embed_model to embedding_model
        scores, indices = index.search(query_vector, k=3)  # Get top 3 chunks
        
        # Retrieve relevant context
        context = "\n\n".join([chunks[i] for i in indices[0]])
        
        # Prepare prompt
        prompt = f"""
        You are an AI assistant that answers questions based only on the given context.

        <UserQuestion>
        {query}
        </UserQuestion>

        <RelevantContext>
        {context}
        </RelevantContext>

        Instructions:
        1. Answer using ONLY the provided context.
        2. Be concise and accurate.
        3. Format your response with Markdown:
           - Use bullet points for lists
           - Use tables for comparisons
           - Use headings to organize content
        4. If the answer isn't in the context, say:
           "I couldn't find relevant information in the document."
        """
        
        # Generate response
        if tokenizer.chat_template is not None:
            messages = [{"role": "user", "content": prompt}]
            prompt = tokenizer.apply_chat_template(
                messages, add_generation_prompt=True
            )
        
        def generate_stream():
            full_response = ""
            for chunk in stream_generate(
                model,
                tokenizer,
                prompt=prompt,
                max_tokens=1000
            ):

                token_id = chunk.token
                token_text = tokenizer.decode([token_id], skip_special_tokens=True)
                full_response += token_text
                yield f"data: {json.dumps({'token': {'text': token_text}})}\n\n"
            yield "data: [DONE]\n\n"
        
        return Response(stream_with_context(generate_stream()), content_type='text/event-stream')
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ... [rest of your code remains exactly the same] ...

def get_relevant_context(user_input, k=3):
    """Find similar past messages."""
    if not conversation_embeddings:
        return []
    
    input_embedding = embedding_model.encode([user_input])[0].astype('float32')
    embeddings = np.array(conversation_embeddings).astype('float32')
    
    index = faiss.IndexFlatL2(embeddings.shape[1])
    index.add(embeddings)
    _, indices = index.search(np.array([input_embedding]), k)
    
    context = []
    for idx in indices[0]:
        if 0 <= idx < len(conversation_messages):
            context.append(conversation_messages[idx]["content"])
    return context

def store_message(role, content):
    """Thread-safe message storage with embedding."""
    embedding = embedding_model.encode([content])[0]
    
    with conversation_lock:
        conversation_embeddings.append(embedding)
        conversation_messages.append({
            'role': role,
            'content': content,
            'timestamp': time.time()
        })

def clean_response(text):
    """Clean and format the response."""
    # Basic cleaning
    text = text.strip()
    if not text.endswith(('.', '!', '?', '"', "'")):
        text += "."
    
    # Fix markdown tables
    if "|" in text:
        lines = text.split("\n")
        fixed_lines = []
        in_table = False
        
        for line in lines:
            if "|" in line:
                if not in_table:
                    fixed_lines.append("")  # Add blank line before table
                    in_table = True
                if not line.startswith("|"):
                    line = "|" + line
                if not line.endswith("|"):
                    line = line + "|"
                fixed_lines.append(line)
            else:
                if in_table:
                    fixed_lines.append("")  # Add blank line after table
                    in_table = False
                fixed_lines.append(line)
        
        text = "\n".join(fixed_lines).strip()
    
    return text

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    data = request.get_json()
    user_input = data.get('message', '').strip()
    
    if not user_input:
        return jsonify({"error": "Empty input"}), 400
    
    # Store user message immediately
    store_message('user', user_input)
    
    # Prepare context
    context_messages = get_relevant_context(user_input)
    context_text = "\n".join(context_messages) if context_messages else ""
    
    messages = [
        {
            "role": "system",
            "content": (
                "You are Alan 1.0, an AI assistant developed by Alibaba and fine-tuned by Alan Joshua.\n"
                "Format responses with proper Markdown:\n"
                "- Use tables for comparisons\n"
                "- Use bullet points for lists\n"
                "- Maintain consistent spacing\n"
                "- Always complete your thoughts"
            )
        },
        {
            "role": "user",
            "content": f"Context:\n{context_text}\n\nQuestion:\n{user_input}"
        }
    ]

    def generate_response():
        full_response = ""
        try:
            # Generate response stream
            prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True) if tokenizer.chat_template else \
                    f"{messages[0]['content']}\n\nUser: {messages[1]['content']}\n\nAssistant:"
            
            for chunk in stream_generate(model, tokenizer, prompt=prompt, max_tokens=1000):
                token_id = chunk.token
                token_text = tokenizer.decode([token_id], skip_special_tokens=True)
                full_response += token_text
                yield f"data: {json.dumps({'token': {'text': token_text}})}\n\n"
            
            # Post-process and store the complete response
            processed_response = clean_response(full_response)
            store_message('assistant', processed_response)
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate_response()), content_type='text/event-stream')

@app.route('/api/chat/history', methods=['GET'])
def get_history():
    """Return conversation history sorted by timestamp"""
    with conversation_lock:
        sorted_messages = sorted(conversation_messages, key=lambda x: x['timestamp'])
        return jsonify({'messages': sorted_messages})

@app.route('/api/chat/clear', methods=['POST'])
def clear_history():
    """Clear conversation history"""
    with conversation_lock:
        conversation_embeddings.clear()
        conversation_messages.clear()
    return jsonify({'status': 'success'})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5006, threaded=True)

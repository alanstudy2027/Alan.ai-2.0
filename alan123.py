from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from mlx_lm import load, stream_generate
import json
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
import time
import random
import re
import threading

app = Flask(__name__)
CORS(app)

# Initialize models
model, tokenizer = load("mlx-community/Qwen3-4B-Instruct-2507-4bit")
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

# Conversation storage with thread lock
conversation_lock = threading.Lock()
conversation_embeddings = []
conversation_messages = []

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

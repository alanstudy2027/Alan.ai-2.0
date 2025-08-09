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

app = Flask(__name__)
CORS(app)

# Load MLX model and tokenizer
model, tokenizer = load("mlx-community/Qwen3-4B-Instruct-2507-4bit")

# Initialize FAISS and embedding model
embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
dimension = 384
faiss_index = faiss.IndexFlatL2(dimension)

# Conversation storage
conversation_embeddings = []
conversation_messages = []

def get_relevant_context(user_input, k=3):
    """Find similar past messages."""
    if not conversation_embeddings:
        return []
    input_embedding = embedding_model.encode([user_input])[0].astype('float32')
    embeddings = np.array(conversation_embeddings).astype('float32')
    faiss_index.reset()
    faiss_index.add(embeddings)
    _, indices = faiss_index.search(np.array([input_embedding]), k)
    context = []
    for idx in indices[0]:
        if 0 <= idx < len(conversation_messages):
            context.append(conversation_messages[idx]["content"])
    return context

def store_message(role, content):
    """Save a message with embedding."""
    embedding = embedding_model.encode([content])[0]
    conversation_embeddings.append(embedding)
    conversation_messages.append({
        'role': role,
        'content': content,
        'timestamp': time.time()
    })

def clean_incomplete_sentence(text):
    """Ensure the response ends with punctuation."""
    text = text.strip()
    if not text.endswith(('.', '!', '?', '"', "'")):
        text += "..."
    return text

def fix_markdown_tables(text):
    """Ensure Markdown tables are valid and consistent."""
    lines = text.split("\n")
    fixed_lines = []
    in_table = False
    column_count = None
    for line in lines:
        if "|" in line:
            if not in_table:
                in_table = True
                fixed_lines.append("")  # Blank line before table
            if not line.strip().startswith("|"):
                line = "|" + line
            if not line.strip().endswith("|"):
                line = line + "|"
            cols = line.split("|")
            if column_count is None:
                column_count = len(cols)
            else:
                while len(cols) < column_count:
                    cols.insert(-1, " ")
                line = "|".join(cols)
            fixed_lines.append(line)
        else:
            if in_table:
                fixed_lines.append("")  # Blank line after table
                in_table = False
            fixed_lines.append(line)
    return "\n".join(fixed_lines).strip()

def format_response(text):
    """Fix spacing, bullets, and table separation."""
    text = re.sub(r'([.,!?])([A-Za-z])', r'\1 \2', text)
    text = re.sub(r'(\|.*\|)', r'\n\1\n', text)
    text = re.sub(r'(\S)\n- ', r'\1\n\n- ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def is_table_incomplete(text):
    """Check if the last table is incomplete."""
    table_lines = [line for line in text.split("\n") if "|" in line]
    if not table_lines:
        return False
    header_cols = table_lines[0].count("|")
    last_row = table_lines[-1]
    if last_row.count("|") < header_cols:
        return True
    if not last_row.strip().endswith("|"):
        return True
    return False

def complete_table_with_model(partial_text, messages):
    """Ask the model to finish the incomplete table."""
    continuation_prompt = f"""
The following table is incomplete. Continue the table exactly from where it stopped.
Do not repeat any rows that are already written.
Do not add explanations — only output the remaining table rows in Markdown.

{partial_text}
"""
    continuation_messages = messages + [{"role": "user", "content": continuation_prompt}]
    if tokenizer.chat_template:
        prompt = tokenizer.apply_chat_template(continuation_messages, add_generation_prompt=True)
    else:
        prompt = "\n".join(m["content"] for m in continuation_messages)
    continuation = ""
    for chunk in stream_generate(model, tokenizer, prompt=prompt, max_tokens=200):
        token_id = chunk.token
        token_text = tokenizer.decode([token_id], skip_special_tokens=True)
        continuation += token_text
    return partial_text + "\n" + continuation.strip()

@app.route('/api/chat/stream', methods=['POST'])
def chat_stream():
    data = request.get_json()
    user_input = data.get('message', '').strip()
    if not user_input:
        return jsonify({"error": "Empty input"}), 400

    # Get 50% of relevant context
    context_messages = get_relevant_context(user_input)
    selected_context = random.sample(context_messages, max(1, len(context_messages) // 2)) if context_messages else []
    context_text = "\n".join(selected_context)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful AI assistant.\n"
                "When answering:\n"
                "- If the user question contains keywords such as 'compare', 'difference', 'differentiate', 'versus', 'vs', or 'comparison', present the main answer in table form.\n"
                "- Use clear Markdown formatting for lists, headings, and table form\n"
                "- Always leave a blank line before and after table form\n"
                "- For lists, use proper bullet or number indentation\n"
                "- Use emojis naturally to enhance clarity, not overload the response\n"
                "- Maintain consistent spacing between words and punctuation\n"
                "- Do not leave table form incomplete\n"
                "- Always end with a complete sentence"
            )
        },
        {
            "role": "user",
            "content": f"<previous_conversation>\n{context_text}\n</previous_conversation>\n\n<user_input>\n{user_input}\n</user_input>"
        }
    ]

    if tokenizer.chat_template:
        prompt = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    else:
        prompt = f"{messages[0]['content']}\n\n{messages[1]['content']}"

    def stream_response():
        full_response = ""
        try:
            for chunk in stream_generate(model, tokenizer, prompt=prompt, max_tokens=500):
                token_id = chunk.token
                token_text = tokenizer.decode([token_id], skip_special_tokens=True)
                full_response += token_text
                if token_text.strip():
                    yield f"data: {json.dumps({'token': {'text': token_text}})}\n\n"

            # Post-processing order
            full_response = clean_incomplete_sentence(full_response)
            full_response = fix_markdown_tables(full_response)

            # Check for incomplete table and complete it
            if is_table_incomplete(full_response):
                full_response = complete_table_with_model(full_response, messages)

            full_response = format_response(full_response)
            store_message('assistant', full_response)

        except GeneratorExit:
            if full_response:
                full_response = clean_incomplete_sentence(full_response)
                full_response = fix_markdown_tables(full_response)
                if is_table_incomplete(full_response):
                    full_response = complete_table_with_model(full_response, messages)
                full_response = format_response(full_response)
                store_message('assistant', full_response)
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(stream_with_context(stream_response()), content_type='text/event-stream')

@app.route('/api/chat/history', methods=['GET'])
def get_conversation_history():
    return jsonify({'messages': conversation_messages})

if __name__ == "__main__":
    app.run(debug=True, port=5000)

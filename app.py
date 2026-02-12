import os

from anthropic import Anthropic
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

from database import init_db, create_conversation, save_message, get_messages, conversation_exists

load_dotenv()

app = Flask(__name__)
client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """\
Tu es un assistant IA polyvalent, intelligent et amical. Tu excelles dans 4 domaines :

1. **Support client** : Tu reponds aux questions des utilisateurs sur des produits \
ou services avec patience et professionnalisme. Tu cherches toujours a resoudre \
les problemes rapidement.

2. **Assistant personnel** : Tu aides a organiser le quotidien — planification, \
rappels, conseils pratiques, redaction de messages, et toute tache de productivite.

3. **Tuteur educatif** : Tu expliques des concepts de maniere claire et pedagogique, \
tu adaptes ton niveau au besoin de l'utilisateur, et tu donnes des exemples concrets \
pour faciliter l'apprentissage.

4. **Assistant code** : Tu aides les developpeurs avec l'ecriture de code, le debugging, \
les revues de code, et les explications techniques. Tu fournis des exemples de code \
fonctionnels et bien commentes.

Regles generales :
- Reponds toujours en francais sauf si l'utilisateur ecrit dans une autre langue.
- Sois concis mais complet.
- Si tu ne connais pas la reponse, dis-le honnetement.
- Adapte ton ton au contexte : professionnel pour le support, pedagogique pour \
l'enseignement, technique pour le code.\
"""

init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/conversations", methods=["POST"])
def new_conversation():
    data = request.get_json()
    conv_id = data.get("conversation_id")
    if not conv_id:
        return jsonify({"error": "conversation_id requis"}), 400
    if not conversation_exists(conv_id):
        create_conversation(conv_id)
    return jsonify({"conversation_id": conv_id})


@app.route("/conversations/<conv_id>/messages", methods=["GET"])
def list_messages(conv_id):
    if not conversation_exists(conv_id):
        return jsonify({"error": "Conversation introuvable"}), 404
    messages = get_messages(conv_id)
    return jsonify({"messages": messages})


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    conv_id = data.get("conversation_id")
    user_message = data.get("message", "")

    if not conv_id or not user_message:
        return jsonify({"error": "conversation_id et message requis"}), 400

    if not conversation_exists(conv_id):
        create_conversation(conv_id)

    save_message(conv_id, "user", user_message)

    history = get_messages(conv_id)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=history,
        )
        reply = response.content[0].text
        save_message(conv_id, "assistant", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

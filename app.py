import os
import secrets

from anthropic import Anthropic
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session

from database import (
    init_db,
    create_user,
    authenticate_user,
    get_user,
    create_conversation,
    get_user_conversations,
    conversation_belongs_to_user,
    save_message,
    get_messages,
)

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
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


def get_current_user():
    user_id = session.get("user_id")
    if user_id:
        return get_user(user_id)
    return None


# --- Pages ---

@app.route("/")
def index():
    if not get_current_user():
        return render_template("auth.html")
    return render_template("index.html")


# --- Auth ---

@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Nom d'utilisateur et mot de passe requis"}), 400
    if len(password) < 6:
        return jsonify({"error": "Le mot de passe doit contenir au moins 6 caracteres"}), 400

    user_id = create_user(username, password)
    if not user_id:
        return jsonify({"error": "Ce nom d'utilisateur est deja pris"}), 409

    session["user_id"] = user_id
    return jsonify({"username": username})


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "")

    user_id = authenticate_user(username, password)
    if not user_id:
        return jsonify({"error": "Identifiants incorrects"}), 401

    session["user_id"] = user_id
    return jsonify({"username": username})


@app.route("/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/auth/me", methods=["GET"])
def me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non connecte"}), 401
    return jsonify({"username": user["username"]})


# --- Conversations ---

@app.route("/conversations", methods=["GET"])
def list_conversations():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non connecte"}), 401
    convs = get_user_conversations(user["id"])
    return jsonify({"conversations": convs})


@app.route("/conversations", methods=["POST"])
def new_conversation():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non connecte"}), 401
    data = request.get_json()
    conv_id = data.get("conversation_id")
    if not conv_id:
        return jsonify({"error": "conversation_id requis"}), 400
    create_conversation(conv_id, user["id"])
    return jsonify({"conversation_id": conv_id})


@app.route("/conversations/<conv_id>/messages", methods=["GET"])
def list_messages(conv_id):
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non connecte"}), 401
    if not conversation_belongs_to_user(conv_id, user["id"]):
        return jsonify({"error": "Conversation introuvable"}), 404
    messages = get_messages(conv_id)
    return jsonify({"messages": messages})


# --- Chat ---

@app.route("/chat", methods=["POST"])
def chat():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Non connecte"}), 401

    data = request.get_json()
    conv_id = data.get("conversation_id")
    user_message = data.get("message", "")

    if not conv_id or not user_message:
        return jsonify({"error": "conversation_id et message requis"}), 400

    if not conversation_belongs_to_user(conv_id, user["id"]):
        create_conversation(conv_id, user["id"])

    save_message(conv_id, "user", user_message)
    history = get_messages(conv_id)

    personalized_prompt = (
        SYSTEM_PROMPT
        + f"\n\nL'utilisateur s'appelle {user['username']}. "
        + "Tu peux utiliser son prenom pour personnaliser tes reponses."
    )

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            system=personalized_prompt,
            messages=history,
        )
        reply = response.content[0].text
        save_message(conv_id, "assistant", reply)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

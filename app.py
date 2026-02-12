import os

from anthropic import Anthropic
from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify

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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "Aucun message fourni"}), 400

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        reply = response.content[0].text
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

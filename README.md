# ChatBot IA

Un chatbot web intelligent propulse par Ollama (modeles IA gratuits en local).

## Prerequis

Installez Ollama sur votre machine :

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

Puis telechargez un modele (Mistral par defaut) :

```bash
ollama pull mistral
```

## Installation

```bash
pip install -r requirements.txt
```

## Configuration (optionnel)

Copiez le fichier `.env.example` en `.env` pour personnaliser :

```bash
cp .env.example .env
```

Variables disponibles :
- `OLLAMA_BASE_URL` : URL d'Ollama (defaut: `http://localhost:11434`)
- `OLLAMA_MODEL` : Modele a utiliser (defaut: `mistral`)

Modeles recommandes : `mistral`, `llama3`, `gemma2`, `phi3`

## Lancement

1. Lancez Ollama :
```bash
ollama serve
```

2. Lancez le chatbot :
```bash
python app.py
```

3. Ouvrez http://localhost:5000 dans votre navigateur.

## Fonctionnalites

- Inscription / connexion avec mot de passe securise
- Multi-conversations avec barre laterale
- Reponses en streaming (mot par mot)
- Rendu Markdown avec coloration syntaxique du code
- Export des conversations en fichier texte
- Le bot se souvient de l'utilisateur et de l'historique

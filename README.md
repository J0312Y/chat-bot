# ChatBot IA

Un chatbot web intelligent propulse par Claude (Anthropic).

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Copiez le fichier `.env.example` en `.env` et ajoutez votre cle API Anthropic :

```bash
cp .env.example .env
```

Editez `.env` :
```
ANTHROPIC_API_KEY=votre-cle-api
```

## Lancement

```bash
python app.py
```

Ouvrez http://localhost:5000 dans votre navigateur.

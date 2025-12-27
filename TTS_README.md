# Text-to-Speech (TTS) Integration mit CosyVoice 3

Diese Anwendung nutzt **CosyVoice 3**, ein mehrsprachiges TTS-System von FunAudioLLM, um Video-Inhalte vorzulesen.

## 🎯 Features

- **Mehrsprachige Unterstützung**: Deutsch, Englisch, Chinesisch, Japanisch, Koreanisch
- **Automatische Spracherkennung**: Erkennt automatisch Deutsch/Englisch
- **Intelligentes Chunking**: Teilt lange Texte automatisch in optimale Segmente
- **Audio-Caching**: Wiederverwendung bereits generierter Audiodaten
- **Markdown-Support**: Liest formatierte Inhalte korrekt vor
- **Play/Pause/Stop**: Vollständige Playback-Kontrolle
- **Fortschrittsanzeige**: Zeigt aktuelles Segment und Gesamtfortschritt

## 📁 Projektstruktur

```
yt-viewer/
├── tts-app.sh                          # Haupt-Startup-Script
├── TTS_README.md                       # Diese Datei
└── src/
    ├── app/video/[videoId]/
    │   └── VideoDetailPageContent.tsx  # TTS UI Integration
    └── shared/hooks/
        └── use-text-to-speech.ts      # TTS React Hook

CosyVoice/                              # TTS Server
├── tts_server.py                       # FastAPI Server
├── start_tts_server.sh                # TTS Server Startup
├── test_tts.py                         # Test-Script
└── pretrained_models/
    └── Fun-CosyVoice3-0.5B/           # Modell-Dateien
```

## 🚀 Schnellstart

### Alles auf einmal starten

```bash
cd ~/yt-viewer
./tts-app.sh start
```

Das startet:
- CosyVoice TTS Server auf `http://127.0.0.1:50000`
- Next.js App auf `http://localhost:3000`

### Nur TTS Server starten

```bash
./tts-app.sh start-tts
```

### Status prüfen

```bash
./tts-app.sh status
```

### Logs anzeigen

```bash
# TTS Server Logs
./tts-app.sh logs tts

# Next.js App Logs
./tts-app.sh logs nextjs
```

### Alles stoppen

```bash
./tts-app.sh stop
```

### Alles neustarten

```bash
./tts-app.sh restart
```

## 🎮 Nutzung in der App

1. **Navigiere zu einer Video-Detailseite**
   - Öffne ein Video in der App (`http://localhost:3000`)

2. **Klappe gewünschte Inhalte auf**
   - Klicke auf die Sektionen, die vorgelesen werden sollen (z.B. TLDR, Summary, etc.)

3. **Starte Vorlesefunktion**
   - Klicke auf den "Read Aloud" Button in der rechten Sidebar
   - Die Sprache wird automatisch erkannt (Deutsch/Englisch)

4. **Steuerung während Wiedergabe**
   - **Pause**: Pausiert die aktuelle Wiedergabe
   - **Resume**: Setzt pausierte Wiedergabe fort
   - **Stop**: Stoppt komplett und setzt zurück

## 🔧 Erweiterte Nutzung

### Verbose-Modus aktivieren

Zeigt detaillierte Output während des Starts:

```bash
./tts-app.sh -v start
```

### Nur Next.js App steuern

```bash
./tts-app.sh start-app    # Nur App starten
./tts-app.sh stop-app     # Nur App stoppen
./tts-app.sh status-app   # Nur App-Status
```

### Nur TTS Server steuern

```bash
./tts-app.sh start-tts    # Nur TTS starten
./tts-app.sh stop-tts     # Nur TTS stoppen
./tts-app.sh status-tts   # Nur TTS-Status
```

## 🛠 Troubleshooting

### TTS Server startet nicht

**Problem**: Server startet nicht oder gesundheitsprüfung schlägt fehl

**Lösungen**:
```bash
# 1. Prüfe Logs
./tts-app.sh logs tts

# 2. Manuelle Diagnose
cd ~/CosyVoice
source .venv/bin/activate
python tts_server.py

# 3. Prüfe ob Port 50000 bereits belegt ist
lsof -i :50000

# 4. Prüfe Modell-Dateien
ls -la pretrained_models/Fun-CosyVoice3-0.5B/
```

### "No expanded sections to read" Fehler

**Problem**: Button klickbar, aber Meldung erscheint

**Lösung**: Mindestens eine Inhalts-Sektion aufklappen (z.B. TLDR, Main Summary)

### "TTS API error" oder "Failed to fetch"

**Problem**: Frontend kann nicht mit TTS Server kommunizieren

**Lösungen**:
```bash
# 1. Prüfe ob TTS Server läuft
./tts-app.sh status-tts

# 2. Teste API direkt
curl http://127.0.0.1:50000/health

# 3. Starte TTS Server neu
./tts-app.sh restart
```

### Audio spielt nicht ab

**Problem**: Audio wird generiert, aber nicht abgespielt

**Lösungen**:
1. Browser-Konsole öffnen (F12) und nach Fehlern suchen
2. Audio-Berechtigungen im Browser prüfen
3. Autoplay-Policy des Browsers prüfen (Chrome/Safari)

### Langsame Audio-Generierung

**Problem**: Erste Generierung dauert lange

**Erklärung**: Das ist normal!
- Erstes Laden: 10-15 Sekunden (Modell-Initialisierung)
- Nachfolgende Anfragen: 5-10 Sekunden pro Segment
- Gecachte Segmente: Sofort

**Optimierung**:
- Kürzere Texte verwenden
- Bereits generierte Inhalte sind gecacht und laden sofort

## 📊 API Endpunkte

Der TTS Server bietet folgende Endpunkte:

### Health Check
```bash
GET http://127.0.0.1:50000/health
```

### Single TTS Request
```bash
POST http://127.0.0.1:50000/tts
Content-Type: application/json

{
  "text": "Hallo, dies ist ein Test.",
  "language": "de",
  "speed": 1.0,
  "use_cache": true
}
```

### Batch Preparation
```bash
POST http://127.0.0.1:50000/prepare
Content-Type: application/json

{
  "segments": [
    {"text": "Erster Text", "language": "de"},
    {"text": "Second text", "language": "en"}
  ],
  "speed": 1.0
}
```

### Get Cached Audio
```bash
GET http://127.0.0.1:50000/audio/{filename}
```

### Clear Cache
```bash
DELETE http://127.0.0.1:50000/cache
```

## 🧪 Manuelles Testen

### Test TTS Server direkt

```bash
cd ~/CosyVoice
source .venv/bin/activate

# Deutsch
curl -X POST http://127.0.0.1:50000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hallo, dies ist ein Test.", "language":"de"}' \
  --output test_german.wav

afplay test_german.wav

# Englisch
curl -X POST http://127.0.0.1:50000/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, this is a test.", "language":"en"}' \
  --output test_english.wav

afplay test_english.wav
```

### Test mit Python-Script

```bash
cd ~/CosyVoice
source .venv/bin/activate
python test_tts.py
```

## 🔒 Sicherheit

- Server läuft nur auf `127.0.0.1` (localhost)
- Kein externer Zugriff möglich
- Ideal für lokale Entwicklung

## 📝 Technische Details

### Unterstützte Sprachen

| Sprache | Code | Beispiel |
|---------|------|----------|
| Deutsch | `de` | "Hallo Welt" |
| Englisch | `en` | "Hello World" |
| Chinesisch | `zh` | "你好世界" |
| Japanisch | `jp` | "こんにちは" |
| Koreanisch | `ko` | "안녕하세요" |
| Kantonesisch | `yue` | - |

### Audio-Spezifikationen

- **Format**: WAV (IEEE Float)
- **Sample Rate**: 24.000 Hz
- **Kanäle**: Mono
- **Qualität**: Sehr hoch (neuronales TTS)

### Performance

- **Initialisierung**: ~5-10 Sekunden beim ersten Start
- **Generierung**: ~2-3 RTF (Real-Time-Factor)
- **Caching**: Hash-basiert, persistent zwischen Server-Neustarts
- **MPS Support**: Nutzt Apple Silicon GPU (M1/M2)

## 🔄 Updates & Wartung

### TTS Server aktualisieren

```bash
cd ~/CosyVoice
source .venv/bin/activate
uv pip install --upgrade -r requirements.txt
```

### Cache leeren

```bash
curl -X DELETE http://127.0.0.1:50000/cache
# oder manuell:
rm -rf ~/CosyVoice/audio_cache/*
```

### Logs rotieren

Die Log-Dateien werden nicht automatisch rotiert:

```bash
# Logs ansehen
cat /tmp/tts-server.log
cat /tmp/nextjs-app.log

# Logs leeren
> /tmp/tts-server.log
> /tmp/nextjs-app.log
```

## 📚 Quellen & Credits

- **CosyVoice 3**: [FunAudioLLM/CosyVoice](https://github.com/FunAudioLLM/CosyVoice)
- **Modell**: Fun-CosyVoice3-0.5B-2512
- **Paper**: [CosyVoice 3: Towards In-the-wild Speech Generation](https://arxiv.org/html/2505.17589v1)

## 📄 Lizenz

Die TTS-Integration nutzt CosyVoice unter der Apache 2.0 Lizenz.

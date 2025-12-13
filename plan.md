# Problem Analysis: Node.js simdjson Library Error

## Problem
```
dyld[21932]: Library not loaded: /opt/homebrew/opt/simdjson/lib/libsimdjson.26.dylib
```

## Root Cause
- Node.js wurde über Homebrew installiert und verweist auf eine simdjson-Bibliothek, die nicht existiert
- Version-Konflikt zwischen der erwarteten libsimdjson.26.dylib und der installierten Version
- Häufiges Problem bei Node.js-Installationen über Homebrew auf macOS

## Lösungsansätze (nach Priorität)

### 1. Node.js über nvm neu installieren (Empfohlen)
- Node.js über nvm (Node Version Manager) installieren statt Homebrew
- Vermidet System-Level-Abhängigkeiten
- Bessere Kontrolle über Node.js-Versionen

### 2. Homebrew simdjson reparieren
- simdjson über Homebrew neu installieren
- Node.js neu verlinken

### 3. Node.js über offiziellen Installer
- Node.js über den offiziellen macOS Installer neu installieren

## Plan (ABGESCHLOSSEN)
1. ✅ Aktuelle Node.js Installation geprüft - Problem bestätigt
2. ✅ nvm war bereits installiert
3. ✅ Node.js v24.12.0 über nvm aktiviert
4. ✅ pnpm neu installiert
5. ✅ Abhängigkeiten waren bereits aktuell
6. ✅ Port-Konflikt behoben (Prozess 29718 beendet)
7. ✅ Entwicklungsserver startet erfolgreich

## Verifikation (BESTÄTIGT)
- ✅ pnpm dev startet ohne Fehler
- ✅ Next.js 15.3.2 läuft auf Port 3030
- ✅ Server ist bereit in 612ms

## Lösung (VOLLSTÄNDIG IMPLEMENTIERT)
Das Problem wurde durch die Verwendung von nvm statt der Homebrew Node.js-Installation gelöst. 

### Durchgeführte Änderungen:
1. **Homebrew Node.js Pfade deaktiviert** in ~/.zshrc:
   - Zeile 1: `export PATH="/opt/homebrew/opt/node@18/bin:$PATH"` → auskommentiert
   - Zeile 19: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` → auskommentiert

2. **nvm automatisch aktiviert**: 
   - nvm war bereits in ~/.zshrc konfiguriert
   - Jetzt wird nvm Node.js v24.12.0 automatisch geladen

3. **Dauerhafte Lösung**:
   - Neue Shell-Sessions verwenden automatisch nvm Node.js
   - Keine simdjson-Abhängigkeitsprobleme mehr
   - pnpm dev startet zuverlässig

### Ergebnis:
- ✅ Node.js v24.12.0 (nvm) wird in neuen Sessions verwendet
- ✅ pnpm dev startet erfolgreich ohne Fehler
- ✅ Next.js 15.3.2 läuft stabil auf Port 3030

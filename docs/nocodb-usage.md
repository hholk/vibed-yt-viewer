# NocoDB-Nutzung im Projekt

Dieser Leitfaden fasst alle Stellen zusammen, an denen das Projekt mit der NocoDB-REST-API kommuniziert. Er beschreibt, welche Funktionen welchen HTTP-Endpoint aufrufen, welche Header und Query-Parameter gesetzt werden, wie die Rückgaben validiert und zwischengespeichert werden und welche Fehlerbehandlung greift. Damit lassen sich Anpassungen an der API-Anbindung gezielt und getestet durchführen.

## Zusammenfassung der Funktionen

| Funktion | HTTP-Methode & Endpoint | Wichtige Parameter / Header | Zwischenspeicherung | Fehlerbehandlung | Zeitkomplexität |
| --- | --- | --- | --- | --- | --- |
| `getNocoDBConfig` | – (liest Umgebungsvariablen) | `NC_URL`, `NC_TOKEN`, `NOCODB_PROJECT_ID`, `NOCODB_TABLE_ID`, optional Overrides | – | wirft `Error`, falls Pflichtvariablen fehlen | O(1) |
| `resolveNumericId` | nutzt intern `fetchVideoByVideoId` (GET) | akzeptiert numerische IDs oder `VideoID`-String | nutzt Cache von `fetchVideoByVideoId` | wirft `Error`, wenn kein Datensatz gefunden | O(1) für numerische IDs, sonst O(1) + Aufwand von `fetchVideoByVideoId` |
| `fetchVideos` | `GET /api/v2/tables/{tableId}/records` | Query: `limit`, `offset`, `sort`, `fields`, `where` (Tagsuche), Header: `xc-token` | – | wandelt 404 in leere Ergebnisliste, sonst `NocoDBRequestError` oder `NocoDBValidationError` | O(1) pro Request |
| `fetchAllVideos` | iteriert über `fetchVideos` | baut Cache-Schlüssel aus Sortierung, Feldern & IDs | speichert komplette Ergebnisliste per `setInCache` | propagiert Fehler aus `fetchVideos` | O(P)`*` |
| `fetchVideoByVideoId` | `GET /api/v2/tables/{tableId}/records` | Query: `where=(VideoID,eq,{videoId})`, `limit=1` | liest & schreibt Cache über `VideoID` | 404 → `null`, sonst Request-/Validierungsfehler | O(1) |
| `updateVideo` | `PATCH /api/v2/tables/{tableId}/records/{Id}` | Body: Felder laut `videoSchema`, Header: `xc-token` | aktualisiert Cache für `VideoID` und `Id` | `NocoDBRequestError` oder `NocoDBValidationError` | O(1) |
| `deleteVideo` | `DELETE /api/v2/tables/{tableId}/records/{Id}` | Header: `xc-token` | entfernt Cache-Einträge (`Id` & `VideoID`) | `NocoDBRequestError` | O(1) |

`*` P entspricht der Anzahl notwendiger Seitenanfragen (TotalRows ÷ PageSize).

## Detailbeschreibung

### `getNocoDBConfig`
* Zweck: Aggregiert die notwendigen Credentials aus den Umgebungsvariablen, optional überschrieben durch Funktionsparameter.
* Nutzung: Jede API-Funktion ruft sie auf, um URL, Token, Projekt- und Tabellen-ID zu erhalten.
* Fehlerszenarien: Fehlt eine Variable, wird ein aussagekräftiger `Error` ausgelöst, sodass Aufrufer Tests schreiben können, die die Konfiguration absichern.

### `resolveNumericId`
* Zweck: Unterstützt Funktionen, die sowohl mit numerischer Tabellen-ID als auch mit `VideoID`-String aufgerufen werden können.
* Funktionsweise: Gibt numerische IDs unverändert zurück. Bei Strings wird versucht, zuerst in eine Zahl zu parsen, ansonsten wird `fetchVideoByVideoId` genutzt, um die numerische `Id` zu ermitteln.
* Fehlerverhalten: Wird kein Datensatz gefunden, wirft die Funktion einen `Error` mit dem Video-Identifier.

### `fetchVideos`
* Endpoint: `GET /api/v2/tables/{tableId}/records`
* Parameter:
  * Paginierung (`limit`, `offset`) basierend auf `page` und `limit`.
  * Sortierung (`sort`) und optionale Feldliste (`fields`).
  * Tag-Suche (`tagSearchQuery`), die als `where`-Klausel mit `ilike`-Vergleichen umgesetzt wird.
* Rückgabe: Liefert `videos` und `pageInfo`, validiert gegen ein Zod-Schema (`videoSchema` oder Custom-Schema via Option `schema`).
* Fehlerbehandlung: 404-Antworten werden in einen leeren Ergebnissatz umgewandelt, andere Fehler erzeugen `NocoDBRequestError` oder `NocoDBValidationError`.

### `fetchAllVideos`
* Zweck: Lädt alle Datensätze seitenweise und kombiniert sie.
* Vorgehen:
  1. Erster Aufruf von `fetchVideos`, um `totalRows` zu bestimmen.
  2. Berechnung aller weiteren Seiten und paralleles Laden mit einer maximalen Nebenläufigkeit von fünf Requests.
  3. Zwischenspeichern des Gesamtergebnisses unter einem Schlüssel aus Sortierung, Feldliste und IDs.
* Fehler: Gibt Fehler von `fetchVideos` unverändert weiter.

### `fetchVideoByVideoId`
* Endpoint: `GET /api/v2/tables/{tableId}/records` mit `where=(VideoID,eq,{videoId})` und `limit=1`.
* Cache: Prüft zuerst `getFromCache(videoId)`. Bei Erfolg wird kein Request ausgelöst. Nach erfolgreichem Request wird `setInCache` mit `VideoID` ausgeführt.
* Rückgabe: Liefert das validierte Video-Objekt oder `null`, falls kein Treffer oder nicht-parsbarer Datensatz (Validierungsfehler → Exception).

### `updateVideo`
* Vorbereitung: Ruft `resolveNumericId`, um ggf. einen `VideoID`-String in eine numerische ID zu übersetzen. Normalisiert `ImportanceRating` zu einer Zahl.
* Endpoint: `PATCH /api/v2/tables/{tableId}/records/{Id}` mit JSON-Body.
* Cache: Aktualisiert Cache-Einträge für `VideoID` und numerische `Id`.
* Fehler: Weitergabe von `NocoDBValidationError` (falls Schema-Parsing fehlschlägt) bzw. Verpackung anderer Fehler in `NocoDBRequestError`.

### `deleteVideo`
* Vorbereitung: ebenfalls `resolveNumericId`.
* Endpoint: `DELETE /api/v2/tables/{tableId}/records/{Id}`.
* Cache: Entfernt Cache-Einträge für den aufgelösten Schlüssel sowie – wenn eine `VideoID` übergeben wurde – den stringbasierten Schlüssel.
* Fehler: Bei Fehlschlag wird ein `NocoDBRequestError` ausgelöst.

## Nutzungsbeispiel

```ts
import {
  fetchVideos,
  fetchVideoByVideoId,
  updateVideo,
  deleteVideo,
} from '@/lib/nocodb';

async function markVideoAsWatched(videoId: string) {
  const video = await fetchVideoByVideoId(videoId);
  if (!video) return null;

  const updated = await updateVideo(video.Id, { Watched: true });
  return updated;
}

async function getLatestVideos() {
  const { videos } = await fetchVideos({ sort: '-CreatedAt', limit: 12 });
  return videos;
}

async function removeVideo(videoId: string) {
  await deleteVideo(videoId);
}
```

## Absicherung durch Tests

Die Datei [`src/lib/nocodb.usage.test.ts`](../src/lib/nocodb.usage.test.ts) deckt die oben beschriebenen Szenarien ab:

* Erwartete Request-URLs, Header und Query-Parameter für `fetchVideos` inkl. Tag-Suche.
* Paginierungslogik und Cache-Nutzung in `fetchAllVideos`.
* Cache-Verhalten und Fehlerabdeckung in `fetchVideoByVideoId`, `updateVideo` und `deleteVideo`.
* Auflösung von numerischen und stringbasierten IDs in `resolveNumericId`.

Die Tests verwenden Axios- und Cache-Mocks, sodass sie deterministisch und ohne externe Abhängigkeiten laufen.

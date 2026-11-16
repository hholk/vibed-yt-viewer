# NocoDB-Nutzung

Serverseitiger Einstieg: `@/features/videos/api/nocodb`. Browser-Komponenten
verwenden die Next.js-API-Routen, niemals NocoDB-Credentials.
`getNocoDBConfig` liest `NC_URL`, `NC_TOKEN`, `NOCODB_PROJECT_ID` und
`NOCODB_TABLE_ID`; explizite Overrides haben Vorrang. Tokens gehören nicht in
`NEXT_PUBLIC_*`-Variablen.

## Record-Operationen

- `fetchVideos`: GET `/api/v2/tables/{tableId}/records` mit `limit`, `offset`,
  `sort`, optional `fields` und einer Tagsuch-Klausel in `where`. Zod validiert
  Antwort und Pagination. 404 liefert eine leere Liste unter Beibehaltung der
  angefragten Seitennummer; andere Requestfehler werden weitergegeben.
- `fetchAllVideos`: Lädt die erste Seite, berechnet Folgeseiten aus `totalRows`
  und lädt maximal fünf Seiten gleichzeitig. Das Gesamtergebnis wird gecacht.
- `fetchVideoByVideoId`: GET auf denselben Record-Endpoint mit `where` und
  `limit=1`. Erfolgreiche Datensätze werden unter VideoID, numerischer ID und
  vorhandenen Row-IDs gecacht. Ein Cache-Treffer vermeidet den Request.
- `resolveNumericId`: Löst numerische IDs oder eine VideoID zur numerischen ID auf.
- `updateVideo`: Löst Record-Identifier auf, normalisiert Rating/Kommentar und
  sendet PATCH `/api/v2/tables/{tableId}/records` mit `Id` im JSON-Body.
  Anschließend wird der Datensatz erneut gelesen und der Einzelrecord-Cache
  aktualisiert. Der PATCH-Response allein ist nicht die Rückgabe.
- `deleteVideo`: Löst Record-Identifier auf und sendet zuerst DELETE auf den
  Record-Endpoint mit `{ Id, filter: '(Id,eq,...)' }` im Body. Der bestehende
  Client versucht bei einem Fehler danach numerischen und gegebenenfalls
  Row-ID-Pfad. Nach Erfolg werden die Einzelrecord-Cache-Schlüssel entfernt.

Alle Requests tragen `xc-token`. `http-client.ts` setzt JSON-Content-Type und
15 Sekunden Timeout. `table-metadata.ts` löst Tabellen-IDs separat auf und kann
zusätzliche Metadaten-Requests ausführen. `cache.ts` hält einen Prozess-Cache
mit standardmäßig fünf Minuten TTL; dies ist kein IndexedDB-/Offline-Cache.

## Beispiel (nur serverseitig)

```ts
import { fetchVideos, updateVideo } from '@/features/videos/api/nocodb';

const { videos } = await fetchVideos({ sort: '-CreatedAt', limit: 12 });
await updateVideo(videos[0].Id, { Watched: true });
```

## Tests

`pnpm exec vitest run src/features/videos/api/nocodb.usage.test.ts`

Die sieben Usage-Tests prüfen Requestparameter, 404-Pagination, Einzelrecord-
Cache, ID-Auflösung, PATCH mit anschließender Aktualisierung, DELETE samt
Cache-Löschung und seitenübergreifendes Laden. Axios, Cache, Logger und
Tabellen-Metadatenauflösung sind gemockt: kein Live-NocoDB und keine Credentials
nötig. Metadatenauflösung und Fehler-Fallbacks sind damit nicht Ende-zu-Ende
verifiziert. Die bestehende `nocodb.test.ts` prüft Konfiguration und Normalisierung.

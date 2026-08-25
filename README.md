# Prototyp für eine intelligente Web-Map

Dieser Prototyp wurde im Rahmen der Bachelorarbeit **„Prototyp für eine intelligente Web-Map“** im Studiengang Geoinformatik an der Hochschule Bochum entwickelt.

Ziel des Prototypen ist die Bereitstellung einer kontextabhängigen Web-Map, welche die dahinterliegende Idee von intelligenten Karten, die sich automatisch an aktuelle Nutzungskontexte anpassen, demonstriert und für Nutzer und Nutzerinnen erfahrbar macht.
Er wurde als lauffähige Live-Anwendung entwickelt, bei der die Darstellung von Points of Interest (POIs) anhand von Nutzerinformationen und aktuellen Kontextinformationen angepasst wird.

Thematisch stellt die Webkarte eine interaktive Freizeitkarte dar, die bei der Auswahl von Freizeitaktivitäten (z.B. im Bereich Gastronomie, Einkaufen, Kultur) unterstützen soll.

## Prototyp

**Web-Anwendung:**  
[https://jhlueling.github.io/](https://jhlueling.github.io/)

Die Anwendung kann direkt über einen aktuellen Webbrowser aufgerufen werden.

---

## Bedienung

### 1. Anmeldung

Beim Start der Anwendung öffnet sich zunächst ein Authentifizierungsbereich, wo sich neue Nutzer registrieren und bestehende Nutzer mit ihrem Benutzerkonto einloggen können.

Zur Registration muss man sich mit einer Pseudo-Email (z.B. der Form username@mail.com), einem min. 6-stelligen Passwort und einem Benutzernamen anmelden.
Da für den Prototypen lediglich ein echter Authentifizierungs-Vorgang nachgeahmt wird, werden hier keine realen Informationen erwartet.
Nach der ersten Anmeldung ploppt einmalig ein Popup zur Auswahl von präferierten Freizeitbereichen auf. Diese können über Checkboxen ausgewählt und anschließend gespeichert werden.

Besitzt der Nutzer bereits ein Profil, kann er sich per E-Mail und Passwort über den Login-Bereich anmelden.

Nach erfolgreicher Anmeldung wird die Kartenansicht geöffnet.

### 2. Kartenansicht

In der Kartenansicht werden die verfügbaren Points of Interest (POIs) dargestellt.

Die Karte kann:

- mit der Maus verschoben werden,
- vergrößert und verkleinert werden,
- über die vorhandenen Kartensteuerungen bedient werden.

Die POIs werden abhängig von ihrer ermittelten Relevanz unterschiedlich dargestellt.

### 3. Persönliche Präferenzen

Über die dafür vorgesehene Funktion können persönliche Interessen bzw. bevorzugte POI-Kategorien festgelegt werden.

Diese Informationen werden bei der Ermittlung der POI-Gewichte berücksichtigt.

### 4. POIs und Feedback

Durch Auswahl eines POI-Markers können weitere Informationen zum jeweiligen POI angezeigt werden.

Je nach vorhandenen Funktionen können POIs bewertet bzw. mit Feedback versehen werden.

Nutzerinteraktionen mit POIs werden ebenfalls bei der Personalisierung berücksichtigt.

### 5. Kontextabhängige Anpassung

Die Anwendung berücksichtigt neben nutzerbezogenen Informationen auch aktuelle Kontextinformationen.

Für die Gewichtung der POIs werden unter anderem folgende Einflussfaktoren berücksichtigt:

- persönliche Präferenzen,
- Feedback,
- Nutzerinteraktionen,
- Entfernung,
- Wetter.

Zusätzlich wird der aktuelle Kartenausschnitt bei der Darstellung berücksichtigt.

Die Gewichtung erfolgt regelbasiert. Die resultierenden Werte beeinflussen unter anderem die visuelle Darstellung der POI-Marker.

### 6. Standort

Über die Standortfunktion kann die aktuelle Position des Benutzers auf der Karte angezeigt werden.

### 7. Kartenansicht verändern

Beim Verschieben des Kartenausschnitts wird der aktuelle Kartenkontext berücksichtigt. Dadurch kann sich die Darstellung der POIs entsprechend der aktuellen Kartenansicht verändern.

### 8. Abmelden

Über die Logout-Funktion kann die aktuelle Sitzung beendet werden.

---

## Empfohlener Demonstrationsablauf

Für eine kurze Demonstration des Prototypen kann folgender Ablauf verwendet werden:

1. Web-Anwendung öffnen.
2. Mit einem Benutzerkonto anmelden.
3. Persönliche Präferenzen festlegen.
4. Die angezeigten POIs betrachten.
5. Einen POI auswählen.
6. Feedback bzw. eine Bewertung abgeben.
7. Die Karte verschieben und einen anderen Kartenausschnitt betrachten.
8. Die Veränderung der POI-Darstellung beobachten.
9. Die Standortfunktion ausprobieren.
10. Über die Logout-Funktion abmelden.

---

## Technischer Überblick

Der Prototyp verwendet unter anderem:

- **JavaScript** für die Anwendungslogik
- **Leaflet** für die interaktive Kartenanwendung
- **OpenStreetMap** als Kartengrundlage
- **Supabase** für Authentifizierung und Datenhaltung
- **Open-Meteo** für Wetterdaten

Die POI-Gewichtung erfolgt regelbasiert über eine Einflussmatrix. Die berechneten Gewichte werden für die personalisierte Darstellung der POIs verwendet.

---

## Projektstruktur

Die wichtigsten Dateien und Verzeichnisse des Projekts sind:

```text
/
├── index.html
├── app.js
├── styles.css
├── mapping/
└── ...

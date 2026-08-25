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

In der Kartenansicht werden die benutzerspezifischen Points of Interest (POIs) dargestellt.
Diese sind in 6 Haupt- und mehrere Unterkategorien aufgeteilt und werden daher durch unterschiedlich eingefärbte Marker mit verschiedenen Icons repräsentiert.
Die 6 Hauptkategorien sind Gastronomie, Kultur, Sport, Natur, Einkaufen und Sehenswürdigkeiten.

Um die Performance des Prototyps zu verbessern, werden für jeden Nutzer nach der ersten Anmeldung einmalig eine Zufallsmenge an POIs ausgewählt. Diese sind auf die Städte Bochum (Standort der Hochschule) und Iserlohn (Heimatstadt des Entwicklers) begrenzt.

Nach dem Öffnen der Karte zentriert sich die Ansicht auf den Standort des Nutzers (ggf. muss hierzu erst der Standortnutzung zugestimmt werden). Ein farbiger Umkreis zeigt die aktuelle Genauigkeit des Standorts.
Zusätzlich werden die benutzerspezifischen POI-Marker geladen und entsprechend ihrer aktuellen Relevanz dargestellt.

Die Karte kann nun:

- verschoben werden --> Klicken & Ziehen mit der Maus / Wischen mit dem Finger (Mobilgerät),
- vergrößert und verkleinert werden --> Mausrad / Pinch-to-Zoom (Mobilgerät),
- über die vorhandenen Kartensteuerungen bedient werden --> Zoom-Buttons (links oben), Pfeiltasten der Tastatur.

Der Ebenen-Reiter kann benutzt werden, um einzelne Freizeitbereiche/POI-Kategorien aus- & einzublenden.

### 3. POIs und Feedback

Durch Auswahl eines POI-Markers können weitere Informationen zum jeweiligen POI angezeigt werden.
So erfährt man den Namen und die Unterkategorie des POI (z.B. "C&A - Kleidungsgeschäft").

Außerdem können POIs über das Popup bewertet bzw. mit Feedback versehen werden. Dazu kann man eine einfache "Gefällt mir"-Checkbox anhaken und/oder bis zu 5 Punkte (ähnlich einer Google-Bewertung) vergeben.

Nutzerinteraktionen mit POIs (Klicks, Bewertungen) werden bei der Personalisierung berücksichtigt.

### 4. Kontextabhängige Anpassung

Die Anwendung berücksichtigt neben nutzerbezogenen Informationen auch aktuelle Kontextinformationen.

Die gesammelten Informationen werden dazu verwendet die POIs anhand von festgelegten Kriterien und Regeln unterschiedlich stark zu gewichten.
Dadurch soll ein für den jeweiligen Nutzer optimiertes Anwendungserlebnis ermöglicht werden.

Für die Gewichtung der POIs werden unter anderem folgende Einflussfaktoren berücksichtigt:

- persönliche Präferenzen,
- Feedback,
- Nutzerinteraktionen,
- Entfernung,
- Wetter.

Zusätzlich wird der aktuelle Kartenausschnitt bei der Darstellung berücksichtigt.

Die resultierenden Werte beeinflussen maßgeblich die visuelle Darstellung der POI-Marker.
Dazu gehören die Größe, die Transparenz und die Sichtbarkeit auf bestimmten Zoomstufen.

### 5. Standort

Über die Standortfunktion (Fadenkreuz) kann die aktuelle Position des Benutzers auf der Karte angezeigt werden.

### 6. Adress-Suche

Über die Suchleiste kann eine bestimmte Adresse geladen werden.

### 7. Kartenansicht verändern

Beim Verschieben des Kartenausschnitts wird der aktuelle Kartenkontext berücksichtigt. Dadurch kann sich die Darstellung der POIs entsprechend der aktuellen Kartenansicht verändern.

### 8. Abmelden

Über die Logout-Funktion (Power-Button) kann die aktuelle Sitzung beendet werden.

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
├── data/Icons.json
├── icons/
└── ...

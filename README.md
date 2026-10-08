# Abwesenheitskalender

Urlaubs- und Abwesenheitskalender für die Abteilung, eingebettet per iFrame in SharePoint.

- **Ansicht:** ohne Login, aber nur innerhalb des SharePoint-iFrames (`arbeitsbereiche.vbg.de`)
- **Bearbeiten:** Login per 6-stelligem Code an eine freigeschaltete E-Mail-Adresse, danach 90 Tage angemeldet
- **Rollen:** Mitarbeitend (eigene Einträge, Status geplant/beantragt) · Genehmigend (alle Einträge, genehmigen/ablehnen) · Admin (zusätzlich Personen verwalten)
- Team-, Monats- und Listenansicht, Hamburger Feiertage, Arbeitstage-Zählung, Vertretung, halbe Tage

## Einrichtung

1. **Supabase:** neues Projekt in Region *EU (Frankfurt)* anlegen → `schema.sql` im SQL-Editor ausführen. Vorher in der letzten Zeile Namen und E-Mail des ersten Admins anpassen.
2. **Brevo:** Absenderadresse verifizieren, API-Key erzeugen.
3. **GitHub → Vercel:** Repo importieren, Umgebungsvariablen aus `.env.example` setzen (`APP_SECRET` = mind. 32 zufällige Zeichen, `ACCESS_KEY` = zweiter Zufallswert). Region der Functions: `fra1`.
4. **SharePoint:** Websiteeinstellungen → *HTML-Feldsicherheit* → Domain der App (z. B. `kalender.vercel.app`) erlauben. Dann auf der Seite einen *Einbetten*-WebPart einfügen:

```html
<iframe src="https://DEINE-APP.vercel.app/?k=ACCESS_KEY" width="100%" height="820" style="border:0"></iframe>
```

5. Als Admin im Kalender anmelden → *Personen* → Team anlegen (E-Mail nur bei Personen, die bearbeiten sollen).

## Zugriffssperre

Die Seite liefert nur Inhalte, wenn der Browser meldet, dass sie als iFrame von `ALLOWED_ORIGIN` geladen wird, und der `ACCESS_KEY` stimmt. Direktaufrufe der URL zeigen „Kein Zugriff“. Alle Datenabrufe brauchen ein kurzlebiges Token aus diesem Seitenaufruf.

Grenzen: Die Browser-Angaben lassen sich mit technischen Werkzeugen fälschen. Wer URL **und** Schlüssel kennt, kann die Ansicht gezielt abrufen. Bearbeiten ist davon unabhängig per Login geschützt.

**Falls der Kalender in SharePoint „Kein Zugriff“ zeigt:** SharePoint sendet dann vermutlich keine Herkunftsangabe. `ALLOW_MISSING_REFERER=true` setzen und neu deployen.

## Datenschutz

- Keine Krankheitsgründe erfassen – dafür „Sonstige Abwesenheit“ nutzen.
- Notizen sind nur für angemeldete Personen sichtbar.
- Vor dem Start mit Datenschutz und Personalrat abstimmen (Auftragsverarbeitung Supabase/Vercel/Brevo).

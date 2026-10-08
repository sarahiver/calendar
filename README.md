# Abwesenheitskalender

Urlaubs- und Abwesenheitskalender für die Abteilung, eingebettet per iFrame in SharePoint.

- **Ansicht:** ohne Login, aber nur innerhalb des SharePoint-iFrames (`arbeitsbereiche.vbg.de`)
- **Bearbeiten:** Login mit E-Mail und Passwort, danach 90 Tage angemeldet
- **Rollen:** Mitarbeitend (eigene Einträge, Status geplant/beantragt) · Genehmigend (alle Einträge, genehmigen/ablehnen) · Admin (zusätzlich Personen verwalten)
- Team-, Monats- und Listenansicht, Hamburger Feiertage, Arbeitstage-Zählung, Vertretung, halbe Tage

## Einrichtung

1. **Supabase:** neues Projekt in Region *EU (Frankfurt)* anlegen → `schema.sql` im SQL-Editor ausführen. Vorher in der letzten Zeile Namen und E-Mail des ersten Admins anpassen.
2. **GitHub → Vercel:** Repo importieren, Umgebungsvariablen aus `.env.example` setzen (`APP_SECRET` = mind. 32 zufällige Zeichen, `ACCESS_KEY` = zweiter Zufallswert, `INITIAL_ADMIN_PASSWORD` = Startpasswort für dich). Region der Functions: `fra1`.
3. **SharePoint:** Websiteeinstellungen → *HTML-Feldsicherheit* → Domain der App (z. B. `kalender.vercel.app`) erlauben. Dann auf der Seite einen *Einbetten*-WebPart einfügen:

```html
<iframe src="https://DEINE-APP.vercel.app/?k=ACCESS_KEY" width="100%" height="820" style="border:0"></iframe>
```

4. Im Kalender mit deiner Adresse und `INITIAL_ADMIN_PASSWORD` anmelden → eigenes Passwort festlegen.
5. *Personen* → Team anlegen. Wer bearbeiten soll, bekommt E-Mail und Startpasswort; das muss bei der ersten Anmeldung geändert werden.

**Passwort vergessen:** Admin vergibt unter *Personen* ein neues Startpasswort.

## Zugriffssperre

Die Seite liefert nur Inhalte, wenn der Browser meldet, dass sie als iFrame von `ALLOWED_ORIGIN` geladen wird, und der `ACCESS_KEY` stimmt. Direktaufrufe der URL zeigen „Kein Zugriff“. Alle Datenabrufe brauchen ein kurzlebiges Token aus diesem Seitenaufruf.

Grenzen: Die Browser-Angaben lassen sich mit technischen Werkzeugen fälschen. Wer URL **und** Schlüssel kennt, kann die Ansicht gezielt abrufen. Bearbeiten ist davon unabhängig per Login geschützt.

**Falls der Kalender in SharePoint „Kein Zugriff“ zeigt:** SharePoint sendet dann vermutlich keine Herkunftsangabe. `ALLOW_MISSING_REFERER=true` setzen und neu deployen.

## Datenschutz

- Keine Krankheitsgründe erfassen – dafür „Sonstige Abwesenheit“ nutzen.
- Notizen sind nur für angemeldete Personen sichtbar.
- Vor dem Start mit Datenschutz und Personalrat abstimmen (Auftragsverarbeitung Supabase/Vercel).
- Passwörter werden nur als scrypt-Hash gespeichert. Nach 5 Fehlversuchen wird die Adresse für 15 Minuten gesperrt.

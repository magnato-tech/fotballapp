# Passningsspill ⚽

Mobil webapp for barn som gir poeng for pasninger og ballbesittelse i 2v2 pannaball — **ingen mål teller**.

Bygget med Vite + React + TypeScript. Kjører i Safari på iPhone uten app-installasjon.

---

## Konsept

Appen bruker mobilkameraet (iPhone på stativ over banen) til å:
- Finne ballen via HSV-fargedeteksjon (fargede markører på ballen)
- Gjenkjenne to lag via vestfarger
- Telle pasninger automatisk (+1 når samme lag gjenvinner ballen etter min. avstand)
- Vise kampbar (momentum) og nedtelling i sanntid

Poeng gis **kun for pasninger** — ikke mål.

---

## Oppsett (fysisk)

| Komponent | Rolle |
|-----------|-------|
| iPhone på stativ | Kamera, skjerm, prosessering |
| Powerbank | Lang nok økt |
| Ball med 6–10 fargemarkører (neonrosa/grønn/gul) | Robust balltracking |
| Røde og blå vester | Laggjenkjenning |
| Kjegler / pannabane ~5 m | Spilleområde |

Kamera: 2–3 m fra banen, 1,5–2,5 m høyt, hele banen i bildet.

---

## Kom i gang

```bash
npm install
npm run dev -- --host
```

Åpne URL-en som vises (`http://192.168.x.x:5173`) i Safari på iPhone.

> Kamera krever HTTPS i produksjon. For lokal test fungerer `http://` på iPhone på samme WiFi-nettverk.

---

## Flyten i appen

1. **Kalibrering** — Tap 4 banehjørner, scan ballmarkørfarge, scan rød vest, scan blå vest
2. **Oppsett** — Velg rundetid (60/90/120 s) og min. pasningslengde
3. **Live spill** — Kampbar, nedtelling, pasningsscore, manuell ±1-korreksjon
4. **Sluttskjerm** — Vinner + score

---

## Arkitektur

```
src/
  app/           App.tsx — ruting mellom skjermer
  camera/        CameraService — getUserMedia, bakre kamera
  vision/        HSV fargedeteksjon, balldeteksjon, lagdeteksjon
  tracking/      BallTracker (glattet), PossessionTracker (tilstandsmaskin), PassDetector
  game/          Zustand-state: kalibrering, regler, score, fase
  ui/            CalibrationScreen, LiveGameScreen, SetupScreen, EndScreen
  types/         geometry.ts, game.ts
```

---

## Parametere (justerbare i SetupScreen / DEFAULT_RULES)

| Parameter | Standard | Beskrivelse |
|-----------|----------|-------------|
| Rundetid | 90 s | 60/90/120 s |
| Min. pasningslengde | 0,5 m | Ball må flytte seg minst X meter |
| Maks mottakstid | 2,0 s | Tid til samme lag gjenvinner kontroll |
| Kontrollradius | 0,5 m | Radius for å «ha ballen» |
| Takeover-radius | 0,4 m | Ekstra nærhet for å overta kontroll |
| Konfirmasjonstid | 300 ms | Stabil kontroll kreves i X ms |

---

## Felt-test tips

- Test først med ballen alene (uten spillere) for å sjekke balltracking
- Re-scan farger hvis lyset endrer seg
- Bruk manuell ±1-knapp flittig i første økt
- Debug-toggle (trener) viser FPS, confidence og hendelseslogg
- Mål: barna opplever at appen reagerer **rimelig** — ikke perfekt

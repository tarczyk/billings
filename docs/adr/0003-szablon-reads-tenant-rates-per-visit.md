---
status: accepted
---

# `Szablon` czyta tylko `Stawki najemcy` i liczy się dla wskazanej Wizyty

Treść maila do najemcy (`Szablon`) jest wyliczana formułami wyłącznie ze `Stawki najemcy` (osobna zakładka: Pozycja najemcy + `Data_od` + wartość), nigdy bezpośrednio z `Ceny media`, i dla Wizyty wskazanej polem `ID_wizyty`, a nie „najnowszej”. Wybraliśmy to zamiast żywej synchronizacji ze stawkami spółdzielni, bo priorytetem jest stabilność dla najemcy (stała cena za jednostkę, zmiany raz na pół roku), a odtworzenie dowolnego maila ma być możliwe bez archiwum wysłanych treści. `ID_wizyty` wynika z daty odczytu licznika (data utworzenia pliku zdjęcia), a tytuł z miesiąca końca okresu odczytowego.

## Rozważone opcje

- `Szablon` czyta z `Ceny media`: każda zmiana stawki spółdzielni trafiałaby do najemcy od razu, łamiąc zasadę stabilności.
- `Szablon` zawsze dla najnowszej Wizyty: mail za poprzedni miesiąc zmieniałby się wstecz po dodaniu nowej Wizyty.
- Zakładka `Wysłane` ze snapshotami: odrzucona jako ręczna praca po każdej Wizycie; dowodem wysyłki jest sam mail.

## Konsekwencje

- Każda wartość w mailu, także czynsz (aneks, wrzesień) i liczba osób, musi mieć `Data_od` w `Stawki najemcy`. Zmiana nie wpływa wstecz na odtworzone Wizyty.
- Korekta półroczna pojawia się tylko w ręcznie wskazanej Wizycie i tylko gdy ≠ 0.
- Niepełne dane (brak Odczytu medium, `SPRAWDŹ` bez `Stan_przed_wymianą`) dają ostrzeżenie „NIE WYSYŁAĆ”, a nie cichy placeholder `0`.
- Wysyłka jest na żądanie, nie automatyczna po ostatnim Odczycie.
- Pipeline zdjęć liczników musi zapisywać `Data` i `ID_wizyty` z daty utworzenia pliku, nie z `new Date()`.
- Zależy od zakładki `Stawki najemcy`, która jeszcze nie istnieje (krok 3 planu `2026-09-27-water-tenant-rates`).

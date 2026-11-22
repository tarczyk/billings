---
status: accepted
---

# n8n odpowiada end-to-end za pozyskiwanie dokumentów i odczytów liczników

Cały dopływ danych — dokumenty spółdzielni i Tauron (e-BOK), a później zdjęcia liczników przez bota Telegram — jest pobierany, rozpoznawany, walidowany i zapisywany do skoroszytu `rozliczenie-najem` przez n8n działające na domowym serwerze właściciela. Wybraliśmy to zamiast utrzymywania Apps Script jako jedynego zapisu (z n8n tylko wrzucającym pliki na Dysk), bo właściciel chce jednego systemu dla wszystkich kanałów i natychmiastowego feedbacku w bocie Telegram. Istniejący pipeline zdjęć liczników w Apps Script (`src/najem.js`, `przetworzNoweLiczniki`) ma zostać przeniesiony do n8n; do tego czasu oba systemy zapisują do skoroszytu, każdy do osobnych zakładek.

## Konsekwencje

- Reguły biznesowe (nazwy pozycji źródłowych, domykanie `Data_od`/`Data_do`, deduplikacja, kontrole sum) żyją w workflow n8n, dlatego workflow eksportuje się przez `n8n export:workflow` do `n8n/workflows/` w tym repozytorium i commituje po każdej zmianie.
- Pipeline liczników przechodzi do n8n razem z botem Telegram (v3), nie wcześniej.
- Rozpoznane dane nie trafiają bezpośrednio do `Ceny media`/`Faktury`: w v1 lądują w zakładce przeglądu z polem „zatwierdzono”; od v3 zatwierdzanie przenosi się na przyciski w Telegramie.
- n8n zapisuje według układu kolumn arkusza; zmiany układu w docelowych zakładkach trzeba uzgodnić z workflow.
- Pozyskiwanie zależy od dostępności domowego serwera; formuły po stronie Google działają bez niego.

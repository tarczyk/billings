# Krok 4: punkt cofnięcia (2026-11-22)

`Woda ciepla!E4` przed zmianą (Cena_jedn z `Ceny media`):

```
=MAP(B4:B; LAMBDA(d; IF(d=""; ""; IFERROR(LET(cw; IFERROR(INDEX(FILTER('Ceny media'!$C$4:$C$50; 'Ceny media'!$B$4:$B$50="Ciepła woda"; 'Ceny media'!$E$4:$E$50<=d; ('Ceny media'!$F$4:$F$50>=d)+('Ceny media'!$F$4:$F$50="-")); 1)); split_cw; IFERROR(SUM(FILTER('Ceny media'!$C$4:$C$50; ('Ceny media'!$B$4:$B$50="Zimna woda do podgrzania")+('Ceny media'!$B$4:$B$50="Podgrzanie wody-opł.zm."); 'Ceny media'!$E$4:$E$50<=d; ('Ceny media'!$F$4:$F$50>=d)+('Ceny media'!$F$4:$F$50="-"))); 0); first_cw; IFERROR(INDEX(FILTER('Ceny media'!$C$4:$C$50; 'Ceny media'!$B$4:$B$50="Ciepła woda"); 1)); IFS(ISNUMBER(cw); cw; split_cw>0; split_cw; TRUE; first_cw)); ""))))
```

`Woda ciepla!F4` przed zmianą:

```
=ARRAYFORMULA(IF((B4:B="")+(D4:D=""); ""; ROUND(D4:D*E4:E; 2)))
```

Zakładka `Szablon` (statyczna) nie została zmieniona; nowy widok jest w `Szablon nowy`.

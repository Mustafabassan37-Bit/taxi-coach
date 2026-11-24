// Halteplatzliste TAXI RUF Köln eG, Stand Januar 2023 – aus Fotos des Hefts abgetippt.
// Spalten: [Funkkanal, Nr., Name, Zone, Lage, Anzahl Plätze, Rufsäule (1 = ja), Zeiten]
// null = auf dem Foto nicht lesbar (Nr. bei Kanal 1, Plätze bei Kanal 2 und 4).
window.HALTEPLAETZE = [
  // ----- Funkkanal 1 -----
  [1, null, 'B. K. Allee', 207, 'Berlin-Kölnische-Allee (Arnoldiplatz)', 4, 0, '6–22'],
  [1, null, 'Bayenthalgürtel', 207, 'Bayenthalgürtel 32 / Goltsteinstr.', 10, 1],
  [1, null, 'Bonotel', 207, 'Bonner Str. 478 (Höhe Bonotel)', 3, 0],
  [1, null, 'Brühler Anna', 207, 'Brühler Str. 118 (Höhe Kirche)', 2, 0],
  [1, null, 'Conti', 209, 'Piusstr. (Haupteingang Melaten)', 4, 0],
  [1, null, 'Geisberg', 208, 'Geisbergstr. / Luxemburger Str.', 3, 0],
  [1, null, 'Hildegardis', 209, 'Bachemer Str. (Hildegardis Krhs)', 5, 1],
  [1, null, 'Hohenlind', 209, 'Werthmannstr. 1 (Elisabeth Krhs)', 4, 0],
  [1, null, 'Hültzstr.', 209, 'Hültzstr. / Aachener Str.', 10, 0],
  [1, null, 'Junkersdorf', 210, 'Am Römerhof / Aachener Str.', 10, 1],
  [1, null, 'Justiz', 208, 'Luxemburger Str. 101', 6, 0],
  [1, null, 'Klettenberggürtel', 208, 'Klettenberggürtel 88 / Luxemburger Str.', 5, 1],
  [1, null, 'Kölnberg', 206, 'An der Fuhr 4', 2, 0],
  [1, null, 'Marsdorf', 210, 'Max-Planck-Straße', 5, 0],
  [1, null, 'Maternusplatz', 206, 'Hauptstr. 85 (Bezirksrathaus)', 6, 1],
  [1, null, 'Müngersdorf', 210, 'Aachener Str. 703 / Alter Militärring', 4, 0],
  [1, null, 'Rondorf', 206, 'Kapellenstr. 13', 2, 1],
  [1, null, 'Koblenzer Str.', 207, 'Koblenzer Str. / Bonner Str.', 4, 0],
  [1, null, 'Siebengebirgsallee', 208, 'Siebengebirgsallee / Luxemburger Str.', 6, 0],
  [1, null, 'Stadtwald', 209, 'Stadtwaldgürtel 1 / Dürener Str.', 10, 1],
  [1, null, 'Stelzmann', 208, 'Joseph-Stelzmann-Str. 1 / Zülpicher Str.', 5, 0],
  [1, null, 'Südbahnhof', 208, 'Otto-Fischer-Str. (Süd-Bhf.)', 3, 0],
  [1, null, 'Südfriedhof', 207, 'Vorgebirgstr. / Höninger Platz', 5, 0],
  [1, null, 'Sürth', 206, 'Falderstr. 1', 4, 1],
  [1, null, 'Unicenter', 208, 'Luxemburger Str. 124', 2, 0],
  [1, null, 'Uniklinik', 208, 'Kerpener Str. 62 (Haupteingang Bettenhaus)', 10, 0],
  [1, null, 'Voigtel', 209, 'Voigtelstr. / Aachener Str.', 5, 0],
  [1, null, 'Weiden', 210, 'An der alten Post / Aachener Str.', 8, 1],
  [1, null, 'Weißer Str.', 206, 'Weißer Str. 37', 3, 0],
  [1, null, 'Zollstock', 207, 'Höninger Weg / Gottesweg', 6, 1],
  [1, null, 'Zülpicher Hof', 208, 'Lindenthalgürtel 1 / Zülpicher Str.', 10, 1],

  // ----- Funkkanal 2 -----
  [2, '103', 'Bilderstöckchen', 215, 'Longericher Str. 1 / Parkgürtel', null, 1],
  [2, '092', 'Bocklemünd', 212, 'Venloer Str. 1002 (KVB P & R)', null, 1],
  [2, '094', 'Butzweiler', 212, 'Mathias-Brüggen-Str.', null, 1],
  [2, '098', 'Chorweiler', 213, 'Liverpooler Platz', null, 1],
  [2, '107', 'Colonia', 214, 'An der Schanz 1', null, 0],
  [2, '088', 'Ehrenfeldgürtel', 211, 'Ehrenfeldgürtel 1 (Höhe Burger King)', null, 1],
  [2, '082', 'Franz Geuer', 211, 'Franz-Geuer-Str. / Venloer Str.', null, 1],
  [2, '081', 'Franziskus', 211, 'Subbelrather Str. (ggü. Hs.-Nr. 250)', null, 0],
  [2, '080', 'Helios', 211, 'Venloer Str. 389', null, 0],
  [2, '100', 'Herforder', 213, 'Herforder Str. / Wilhelm-Sollmann-Str.', null, 0, '6–22'],
  [2, '084', 'Hornstr.', 215, 'Hornstr. (ggü. Pascha)', null, 0],
  [2, '091', 'Karl Bosch', 212, 'Westendstr. (Nebeneingang Westfriedhof)', null, 0],
  [2, '108', 'Kempener', 214, 'Kempener Str. 1 / Neusser Str.', null, 1],
  [2, '095', 'Lenauplatz', 211, 'Lenaustr. / Landmannstr.', null, 1],
  [2, '086', 'Liebig', 215, 'Liebigstr. (ggü. Schlachthof)', null, 1],
  [2, '099', 'Longerich', 213, 'Bahnhof Longerich', null, 0],
  [2, '089', 'Maarweg', 211, 'Maarweg / Widdersdorfer Str.', null, 1],
  [2, '104', 'Neuss./Gürtel', 214, 'Neusser Str. (Hochbahn)', null, 1],
  [2, '101', 'Neuss./Sollmann', 213, 'Neusser Str. / Wilhelm-Sollmann-Str.', null, 0],
  [2, '102', 'Niehl', 213, 'Merkenicher Str. / Sebastianstr.', null, 1],
  [2, '096', 'Pesch', 213, 'Konrad-Hausmann-Str. (hinter Tankstelle)', null, 1],
  [2, '083', 'Peter Bauer', 211, 'Subbelrather Str. / Gutenbergstr.', null, 0],
  [2, '109', 'Rich.-Byrd', 212, 'Richard-Byrd-Str. / von-Hünefeld-Str.', null, 0],
  [2, '106', 'Riehl', 214, 'Riehler Gürtel / Stammheimer Str.', null, 1],
  [2, '105', 'Scharnhorst', 214, 'Scharnhorststr. / Neusser Str.', null, 0],
  [2, '087', 'Subbelrath', 211, 'Ehrenfeldgürtel 125 / Subbelrather Str.', null, 0],
  [2, '085', 'SVA', 215, 'Herkulesstr. (ehem. Zulassungsstelle)', null, 0, '6–13'],
  [2, '093', 'Widdersdorf', 212, 'Hauptstr. (ggü. Alte Sandkaul)', null, 0],
  [2, '090', 'Wilh-Mauser', 211, 'Wilh.-Mauser-Str. 1 / Venloer Str.', null, 1],
  [2, '097', 'Worringen S-Bahn', 213, 'Bruchstr. (S-Bahn Haltestelle)', null, 0],
  [2, '110', 'Zoo Bedarfs', 214, 'Alter Stammheimer Weg (Zoo)', null, 0],

  // ----- Funkkanal 3 -----
  [3, '165', 'ABC-Tower', 221, 'Ettore-Bugatti-Str.', 3, 0],
  [3, '132', 'Brück', 219, 'Brücker Mauspfad (KVB-HSt.)', 2, 0],
  [3, '124', 'Buchforst', 218, 'Waldecker Str. / Heidelberger Str.', 4, 1],
  [3, '150', 'Clevischer Ring', 217, 'Hs.-Nr. 121 (vor dem Hotel)', 3, 0],
  [3, '130', 'Dellbrück', 217, 'Im Wieschen / Dellbrücker Hauptstr.', 3, 0],
  [3, '121', 'Deutz Bhf', 216, 'Ottoplatz', 8, 0],
  [3, '123', 'Dorint Messe', 216, 'Deutz-Mülheimer-Str. 22-24', 2, 0],
  [3, '151', 'Dünnwald', 217, 'Leuchterstr. 2', 2, 0],
  [3, '166', 'Ensen', 221, 'Gilgaustr. 42', 2, 0],
  [3, '122', 'Gotenring', 216, 'Eumeniusstr. / Gotenring', 5, 1],
  [3, '143', 'Grengel', 221, 'Am Parkhaus 3 (Flughafen)', 2, 0],
  [3, '134', 'Höhenberg', 220, 'Geraer Str. / Fuldaer Str. (an der U-Bahn)', 2, 0],
  [3, '128', 'Höhenhaus', 217, '(im Umbau)', 3, 1],
  [3, '129', 'Holweide', 217, 'Schnellweiderstr. / Berg. Gladbacher Str.', 3, 0, '22–6'],
  [3, '129', 'Holweide', 217, 'Krhs. Holweide PP (Lampe)', 3, 0, '6–22'],
  [3, '137', 'Humboldt', 220, 'Esserstr. / Gremberger Str.', 6, 1],
  [3, '120', 'Hyatt', 216, 'Kennedyufer 2', 4, 0],
  [3, '117', 'Kalk Karree', 220, 'Dillenburger Str. 25 (Stadtverwaltung)', 2, 0, '6–22'],
  [3, '136', 'Kalk Post', 220, 'Kalker Hauptstr. 72', 3, 0],
  [3, '135', 'Kapelle', 220, 'Kalker Hauptstraße 229-239', 5, 1],
  [3, '136', 'Kaufhof Kalk', 220, 'Kalker Hauptstr. (Kaufhof)', 4, 0],
  [3, '140', 'Klinikum', 219, 'Am Klinikum', 4, 0, '6–22'],
  [3, '142', 'Königsforst', 219, 'Rösrather Str. (Endhaltestelle KVB)', 4, 1],
  [3, '133', 'Merheim', 219, 'Kieskaulerweg (KVB-HSt.)', 4, 0],
  [3, '125', 'Mülheim Bhf', 218, 'Montanusstr. 2', 5, 0],
  [3, '139', 'Ostheim', 219, 'Frankfurter Str. (KVB-HSt.)', 4, 1],
  [3, '146', 'Poll', 220, 'Siegburger Str. (Marktplatz)', 4, 1],
  [3, '148', 'Porz-Krhs.', 221, 'Urbacher Weg 19', 2, 0, '6–22'],
  [3, '145', 'Porz-Mitte', 221, 'An der Sparkasse', 6, 1],
  [3, '118', 'Radisson', 216, 'Am Messekreisel 1', 3, 0],
  [3, '131', 'S-Bahn Dellbrück', 204, 'S-Bahnhof Dellbrück', 3, 0],
  [3, '153', 'Schanzenstr.', 218, 'Schanzenstr. 24', 3, 0],
  [3, '127', 'Stammheim', 218, 'Ricarda-Huch-Str. / Moses-Heß-Str.', 3, 1],
  [3, '141', 'Straßburger', 219, 'Straßburger Platz', 3, 0],
  [3, '164', 'Urbach', 221, 'Kaiserstr. 30', 1, 0],
  [3, '138', 'Vingst', 220, 'Kuthstr. 1 / Ostheimer Str.', 4, 0],
  [3, '119', 'W.-Brandt-Platz', 216, 'Justinianstr. (am Stadthaus)', 6, 0],
  [3, '144', 'Wahn (Bhf)', 221, 'Am Bahnhof', 2, 0],
  [3, '126', 'Wiener Platz', 218, 'Eulenbergstr. / Wiener Platz', 8, 1],
  [3, '167', 'Zündorf', 221, 'Gartenstr. (Endhaltestelle KVB)', 2, 0],

  // ----- Funkkanal 4 -----
  [4, '016', 'Am Hof', 205, 'Am Hof / Roncalliplatz', null, 0],
  [4, '007', 'Barbarossaplatz', 202, 'Luxemburger Str. 2-10', null, 0],
  [4, '039', 'Breite Str.', 203, 'Neven-Dumont-Str. / Breite Str.', null, 0],
  [4, '022', 'Brüsseler', 201, 'Brüsseler Platz', null, 1],
  [4, '019', 'Burgmauer', 201, 'Burgmauer / Unter Fettenhennen', null, 0],
  [4, '001', 'Chlodwigplatz', 202, 'Karolingerring / Merowingerstr.', null, 1],
  [4, '011', 'Barcelo, Hotel', 202, 'Händelstr. 9-11', null, 0],
  [4, '025', 'Helenenstr.', 203, 'Helenenstr. 14 (Pullman Hotel)', null, 0],
  [4, '029', 'Ebertplatz', 201, 'Sudermannstr. / Ebertplatz', null, 0],
  [4, '023', 'Friesenplatz', 201, 'Hohenzollernring / Friesenplatz', null, 0, '6–24'],
  [4, '026', 'Gereonsdriesch', 203, 'Gereonstr. / Gereonsdriesch', null, 1],
  [4, '010', 'Habsburgerring', 202, 'Habsburgerring / Rich.-Wagner-Str.', null, 0],
  [4, '035', 'Herz Jesu', 202, 'Hohenstaufenring 21 (an der Kirche)', null, 0],
  [4, '015', 'Heumarkt', 205, 'Heumarkt (Höhe Reiterstandbild)', null, 0],
  [4, '032', 'Hilton Köln', 201, 'Machabäerstr. 11', null, 0],
  [4, '038', 'Hohenzollernring', 201, 'Hohenzollernring / Im Klapperhof', null, 0],
  [4, '030', 'Johannis', 201, 'Johannisstr. (Hotel Marriott)', null, 0],
  [4, '028', 'K.-W.-Ring', 201, 'Herm.-Becker-Str. / Kaiser-Wilhelm-Ring', null, 0],
  [4, '034', 'Kaufhof', 205, 'Hohe Str. / Cäcilienstr.', null, 0],
  [4, '005', 'Kaygasse', 204, 'am Hotel Wasserturm', null, 0],
  [4, '021', 'Kettengasse', 203, 'Pfeilstr. / Kettengasse', null, 0],
  [4, '002', 'Kleingedank', 202, 'Kleingedankstr. / Lothringer Str.', null, 0],
  [4, '014', 'Maritim', 201, 'Heumarkt 20', null, 0],
  [4, '040', 'Mediapark', 201, 'Im Mediapark / Maybachstr.', null, 0],
  [4, '009', 'Mozart', 202, 'Beethovenstr. / Hohenstaufenring', null, 0],
  [4, '017', 'Mühlengasse', 205, 'Kleine Budengasse / Alter Markt', null, 0],
  [4, '013', 'Neumarkt', 203, 'Neumarkt / Schildergasse', null, 0],
  [4, '020', 'Oper', 203, 'Offenbachplatz (Nord-Süd-Fahrt)', null, 0],
  [4, '018', 'Philharmonie', 205, 'Bischofsgartenstraße', null, 0],
  [4, '036', 'Pilgrimstr.', 201, 'Habsburger Ring 22', null, 0],
  [4, '031', 'Reichensperger', 201, 'Reichenspergerplatz / Weißenburgstr.', null, 1],
  [4, '024', 'Renaissance', 201, 'Magnusstr. 20', null, 0],
  [4, '041', 'Rheinau', 204, 'Holzmarkt / Holzgasse', null, 0],
  [4, '027', 'Römergasse', 203, 'Friesenstr. / Römergasse', null, 0],
  [4, '012', 'Rudolfplatz', 201, 'Hahnenstr. (an der Torburg)', null, 0],
  [4, '003', 'Severinshof', 204, 'Karl-Berbuer-Platz / Severinstr.', null, 0],
  [4, '004', 'Waidmarkt', 204, 'Waidmarkt', null, 0],
  [4, '006', 'Weyerstr.', 200, 'Neue Weyerstr. 4', null, 0],
  [4, '037', 'Zentrale', 202, 'Bonner Wall 37', null, 0],
  [4, '008', 'Zülpicher Platz', 202, 'Hohenstaufenring 20', null, 0]
];

// Kartenpositionen [Breite, Länge] in derselben Reihenfolge wie oben – aus OpenStreetMap
// (© OpenStreetMap-Mitwirkende, ODbL) ermittelt. Ungefähr; null = nicht gefunden.
window.HALTEPLAETZE_GEO = [
  [50.91705, 6.93916], // B. K. Allee
  [50.90481, 6.97192], // Bayenthalgürtel
  [50.90169, 6.96476], // Bonotel
  [50.90530, 6.95797], // Brühler Anna
  [50.93916, 6.92228], // Conti
  [50.90771, 6.91964], // Geisberg
  [50.93089, 6.92295], // Hildegardis
  [50.92410, 6.89711], // Hohenlind
  [50.93666, 6.90761], // Hültzstr.
  [50.93743, 6.86750], // Junkersdorf
  [50.92275, 6.93528], // Justiz
  [50.91206, 6.92440], // Klettenberggürtel
  [50.86286, 6.92627], // Kölnberg
  [50.92242, 6.84648], // Marsdorf
  null, // Maternusplatz
  [50.93759, 6.88073], // Müngersdorf
  [50.87562, 6.94337], // Rondorf
  [50.91450, 6.96174], // Koblenzer Str.
  [50.91533, 6.92756], // Siebengebirgsallee
  [50.92890, 6.90833], // Stadtwald
  [50.92243, 6.92153], // Stelzmann
  [50.92687, 6.93812], // Südbahnhof
  [50.90036, 6.94438], // Südfriedhof
  [50.86317, 7.00590], // Sürth
  [50.92154, 6.93326], // Unicenter
  [50.92321, 6.91780], // Uniklinik
  [50.93721, 6.89425], // Voigtel
  [50.93734, 6.83351], // Weiden
  [50.88851, 7.00056], // Weißer Str.
  [50.91059, 6.94141], // Zollstock
  [50.92059, 6.91496], // Zülpicher Hof
  [50.96917, 6.93950], // Bilderstöckchen
  [50.96997, 6.86651], // Bocklemünd
  [50.97633, 6.89083], // Butzweiler
  [51.02073, 6.89786], // Chorweiler
  [50.96186, 6.98179], // Colonia
  [50.95344, 6.91972], // Ehrenfeldgürtel
  [50.94650, 6.92556], // Franz Geuer
  [50.95440, 6.91841], // Franziskus
  [50.95101, 6.91537], // Helios
  [50.99473, 6.92616], // Herforder
  [50.95531, 6.93999], // Hornstr.
  [50.97094, 6.88605], // Karl Bosch
  [50.96009, 6.95404], // Kempener
  [50.95690, 6.91916], // Lenauplatz
  [50.95636, 6.93420], // Liebig
  [50.99835, 6.90247], // Longerich
  [50.94641, 6.89812], // Maarweg
  [50.96009, 6.95404], // Neuss./Gürtel
  [50.99306, 6.93994], // Neuss./Sollmann
  [50.98927, 6.96168], // Niehl
  [50.99955, 6.87904], // Pesch
  [50.95040, 6.92793], // Peter Bauer
  [50.98543, 6.88732], // Rich.-Byrd
  [50.96392, 6.97630], // Riehl
  [50.96580, 6.95385], // Scharnhorst
  [50.95344, 6.91972], // Subbelrath
  [50.95405, 6.93119], // SVA
  null, // Widdersdorf
  [50.95739, 6.89933], // Wilh-Mauser
  [51.05255, 6.85219], // Worringen S-Bahn
  [50.95892, 6.97242], // Zoo Bedarfs
  [50.90884, 7.05540], // ABC-Tower
  [50.94890, 7.07908], // Brück
  [50.95098, 7.00516], // Buchforst
  [50.97144, 7.00633], // Clevischer Ring
  [50.97431, 7.07511], // Dellbrück
  [50.94027, 6.97464], // Deutz Bhf
  [50.94263, 6.98208], // Dorint Messe
  [50.99639, 7.03807], // Dünnwald
  [50.89928, 7.03079], // Ensen
  [50.93641, 6.97823], // Gotenring
  null, // Grengel
  [50.94175, 7.02243], // Höhenberg
  null, // Höhenhaus
  [50.96946, 7.04471], // Holweide
  [50.96653, 7.05753], // Holweide
  [50.93039, 6.99667], // Humboldt
  null, // Hyatt
  [50.93520, 7.00239], // Kalk Karree
  [50.93750, 6.99765], // Kalk Post
  [50.93773, 7.00178], // Kapelle
  [50.93773, 7.00178], // Kaufhof Kalk
  [50.93749, 7.05236], // Klinikum
  [50.91993, 7.09729], // Königsforst
  [50.94797, 7.04514], // Merheim
  [50.95790, 7.01224], // Mülheim Bhf
  [50.96166, 7.00589], // Ostheim
  [50.91609, 6.99217], // Poll
  [50.89275, 7.05203], // Porz-Krhs.
  [50.88376, 7.05893], // Porz-Mitte
  [50.94399, 6.98623], // Radisson
  [50.98120, 7.06957], // S-Bahn Dellbrück
  [50.96704, 7.01040], // Schanzenstr.
  [50.98618, 6.99842], // Stammheim
  [50.93589, 7.06075], // Straßburger
  [50.88156, 7.08141], // Urbach
  [50.93307, 7.02185], // Vingst
  [50.93915, 6.97881], // W.-Brandt-Platz
  [50.85842, 7.07971], // Wahn (Bhf)
  [50.96166, 7.00589], // Wiener Platz
  null, // Zündorf
  [50.94003, 6.95750], // Am Hof
  null, // Barbarossaplatz
  [50.93909, 6.95069], // Breite Str.
  [50.93836, 6.93473], // Brüsseler
  [50.94130, 6.95625], // Burgmauer
  [50.92113, 6.95868], // Chlodwigplatz
  null, // Barcelo, Hotel
  [50.94001, 6.94509], // Helenenstr.
  null, // Ebertplatz
  [50.94122, 6.94025], // Friesenplatz
  [50.94343, 6.94656], // Gereonsdriesch
  [50.93575, 6.93894], // Habsburgerring
  [50.93064, 6.94070], // Herz Jesu
  [50.93640, 6.96098], // Heumarkt
  [50.94517, 6.96093], // Hilton Köln
  [50.94134, 6.94007], // Hohenzollernring
  [50.94517, 6.96093], // Johannis
  [50.94554, 6.94260], // K.-W.-Ring
  [50.93543, 6.95615], // Kaufhof
  [50.93147, 6.95118], // Kaygasse
  [50.93809, 6.94200], // Kettengasse
  [50.92330, 6.95152], // Kleingedank
  [50.93504, 6.96140], // Maritim
  [50.94554, 6.94260], // Mediapark
  [50.93286, 6.93955], // Mozart
  [50.93935, 6.95996], // Mühlengasse
  [50.93604, 6.94909], // Neumarkt
  [50.93783, 6.95285], // Oper
  [50.94024, 6.96146], // Philharmonie
  [50.93575, 6.93894], // Pilgrimstr.
  [50.95386, 6.96272], // Reichensperger
  [50.94009, 6.94250], // Renaissance
  [50.93295, 6.96290], // Rheinau
  [50.94074, 6.94305], // Römergasse
  [50.93607, 6.94136], // Rudolfplatz
  [50.92862, 6.95746], // Severinshof
  [50.93247, 6.95633], // Waidmarkt
  [50.92999, 6.94515], // Weyerstr.
  [50.91758, 6.95237], // Zentrale
  [50.93064, 6.94070], // Zülpicher Platz
];

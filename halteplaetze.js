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

// Umfeld je Platz, aus OpenStreetMap gezählt (Umkreis meist 400 m): [[Anzahl je Art], [auffällige Namen]]
// Arten: bahnhof, hotel, klinik, bahnbetrieb, event, nacht, restaurant, buero, versicherung, industrie, pflege, arzt, einkauf, uni
window.HALTEPLAETZE_UMFELD = [
  [[0,0,0,0,2,0,1,7,4,0,0,0,0,2],["Südstadion","Kino-Hole","Barmenia Gothaer Versicherungen"]], // B. K. Allee
  [[0,0,0,0,0,0,3,1,0,0,0,3,0,1],[]], // Bayenthalgürtel
  [[0,0,0,0,0,0,4,13,0,0,0,1,0,0],[]], // Bonotel
  [[0,0,0,0,0,1,4,1,0,0,0,0,0,0],[]], // Brühler Anna
  [[0,1,0,0,1,0,1,2,1,0,0,0,0,0],["Japanisches Kulturinstitut","Continentale Kundendienst-Centrum Köln","Best Western Plus Hotel Köln City"]], // Conti
  [[0,0,0,0,1,0,0,0,0,0,0,0,0,0],["Brunosaal"]], // Geisberg
  [[0,0,2,0,1,1,10,19,0,0,0,0,0,1],["St. Hildegardis Krankenhaus","Evangelisches Krankenhaus Köln-Weyertal","Japanisches Kulturinstitut"]], // Hildegardis
  [[0,0,1,0,1,0,0,0,0,0,0,1,0,0],["St.-Elisabeth-Krankenhaus Hohenlind","Caritas-Akademie Köln-Hohenlind"]], // Hohenlind
  [[0,2,1,1,1,1,3,5,2,0,0,3,0,1],["Sana Dreifaltigkeits-Krankenhaus","An einem Tisch","KVB-Betriebshof West","Barmer","Stadtwald-Hotel"]], // Hültzstr.
  [[0,0,2,0,1,0,3,2,0,0,0,3,0,2],["ATOS Orthoparc Klinik Köln","ATOS","NetCologne Stadion"]], // Junkersdorf
  [[0,0,0,0,4,3,7,23,0,0,0,3,0,2],["Alte Mensa","Kino-Hole"]], // Justiz
  [[0,1,0,1,3,2,9,4,2,0,0,5,0,0],["Brunosaal","Kissfriend","Köln Eifeltor","DEVK Berater Siegfried Schanz","day8hotel"]], // Klettenberggürtel
  [[0,1,0,0,0,0,0,0,0,0,0,0,0,0],["Hotel Röttgen Haus"]], // Kölnberg
  [[0,1,0,0,0,0,0,1,0,2,0,0,0,0],["B&B Hotel Köln-West","Antalis"]], // Marsdorf
  null, // Maternusplatz
  [[0,0,0,0,0,0,10,2,0,0,0,2,0,0],[]], // Müngersdorf
  [[0,0,0,0,0,0,0,0,0,0,0,0,0,0],[]], // Rondorf
  [[0,0,0,2,3,3,8,13,0,0,0,4,0,1],["Der dritte Raum","Freies Werkstatt Theater","Güterbahnhof Bonntor"]], // Koblenzer Str.
  [[0,0,0,0,5,6,23,6,2,0,1,6,0,0],["Freiraum Salon","Kissfriend","HUK"]], // Siebengebirgsallee
  [[0,2,0,0,0,2,8,6,1,0,1,3,0,0],["Hotel Haus Schwan","Leonardo Royal Hotel Köln - Am Stadtwald"]], // Stadtwald
  [[0,1,1,0,3,1,20,12,1,0,0,1,0,0],["Universitätsklinikum Köln","Kreativ Studio","Malschule Karola Fels","Debeka","Hotel Ariana"]], // Stelzmann
  [[1,5,0,0,6,40,39,19,0,0,0,1,0,3],["Köln Süd","Greatlive Loftlocation","Off Broadway","Hotel Mado","Elite Hotel"]], // Südbahnhof
  [[0,0,0,0,0,0,4,1,0,0,0,0,0,0],[]], // Südfriedhof
  [[0,1,0,0,1,0,4,2,1,0,0,1,0,0],["Hoch2Werk","Gothaer Versicherung","Hotel Falderhof"]], // Sürth
  [[0,0,0,0,3,3,9,18,0,0,0,3,0,1],["Alte Mensa","Casamax Theater"]], // Unicenter
  [[0,2,1,0,2,0,13,8,1,0,0,7,0,1],["Universitätsklinikum Köln","Kreativ Studio","Malschule Karola Fels","Debeka","Hotel Ariana"]], // Uniklinik
  [[0,0,0,1,2,1,5,4,0,0,4,14,0,0],["An einem Tisch","Ezgi Center","KVB-Betriebshof West"]], // Voigtel
  [[0,1,0,0,0,1,8,4,0,0,2,8,4,0],["Hotel Germania","TK Maxx"]], // Weiden
  [[0,0,0,0,0,0,2,0,0,0,0,2,0,0],[]], // Weißer Str.
  [[0,0,0,1,1,3,12,4,1,0,1,1,1,1],["Halle Zollstock","Köln Eifeltor","Provinzial-Versicherung","Zollstock Arkaden"]], // Zollstock
  [[0,1,0,0,1,0,12,2,1,0,1,7,0,0],["Kreativ Studio","Debeka","Hotel Ariana"]], // Zülpicher Hof
  [[1,0,0,0,2,1,0,0,0,1,0,0,0,0],["Köln Geldernstraße/Parkgürtel","Bezirkssportanlage Nippes","Studio Trafique","ZEG Zweirad-Einkaufs-Genossenschaft eG"]], // Bilderstöckchen
  [[0,1,0,0,0,0,0,2,0,2,1,1,0,0],["Hotel Wilms","Diestelmann Luther"]], // Bocklemünd
  [[0,0,0,0,0,0,1,8,0,1,0,0,0,1],["Herling Baubeschlag GmbH"]], // Butzweiler
  [[2,0,1,0,0,1,1,3,0,0,0,3,1,1],["Köln-Chorweiler","Chorweiler","Ärztehaus Chorweiler","City-Center Chorweiler"]], // Chorweiler
  [[0,1,1,0,2,1,2,1,0,0,0,2,0,0],["Tagesklinik Pionierstraße","LATIBUL","Villa Bodinus"]], // Colonia
  [[1,1,2,0,4,10,23,27,2,1,2,11,0,0],["Köln-Ehrenfeld","Sankt Franzikus-Hospital","KfH-Nierenzentrum","artheater","Urania Theater"]], // Ehrenfeldgürtel
  [[0,1,0,0,1,5,15,26,2,1,0,2,1,1],["Loft","Provinzial Ali Öztas","Weltempfänger","Woolworth"]], // Franz Geuer
  [[1,0,2,0,5,13,25,19,3,1,2,11,0,0],["Köln-Ehrenfeld","Sankt Franzikus-Hospital","KfH-Nierenzentrum","artheater","Urania Theater"]], // Franziskus
  [[1,4,2,0,8,19,17,23,0,3,2,6,0,0],["Köln-Ehrenfeld","KfH-Nierenzentrum","Sankt Franzikus-Hospital","Zentrum für Alte Musik Köln","Cinenova"]], // Helios
  [[0,1,1,0,0,1,2,0,0,0,0,2,0,0],["Heilig Geist-Krankenhaus"]], // Herforder
  [[1,0,0,1,2,2,2,1,0,4,0,0,0,0],["Köln-Nippes","Alte Wursterei, disdance project","XPOST","Köln Hbf, Bft Köln Bbf","\"Odonien\" - Kunst-und Kulturpark"]], // Hornstr.
  [[0,0,0,0,0,0,2,1,0,0,0,1,0,0],[]], // Karl Bosch
  [[0,1,0,0,3,6,9,27,1,0,1,16,1,1],["Zauberschule & Theater","was wir lieben","Provinzial","Boardinghome Nippes","Galeria Karstadt Kaufhof"]], // Kempener
  [[0,0,1,0,3,8,19,15,3,1,0,11,0,0],["Sankt Franzikus-Hospital","Phoenix Kultur- und Integrationszentrum","artheater","Norman Tontsch - Allianz Hauptvertretung","Hutfabrik-Flemming"]], // Lenauplatz
  [[0,0,0,0,1,1,3,5,0,4,0,0,0,0],["Alte Wursterei, disdance project","\"Odonien\" - Kunst-und Kulturpark"]], // Liebig
  [[1,0,0,0,0,3,2,1,0,0,0,0,0,0],["Köln-Longerich"]], // Longerich
  [[0,2,0,1,0,1,3,7,0,3,0,1,0,1],["Köln-Ehrenfeld Gbf","B&B Hotel Köln-Ehrenfeld","West End Hotel","STEINERT GmbH"]], // Maarweg
  [[0,1,0,0,3,6,9,27,1,0,1,16,1,1],["Zauberschule & Theater","was wir lieben","Provinzial","Boardinghome Nippes","Galeria Karstadt Kaufhof"]], // Neuss./Gürtel
  [[0,0,0,1,0,0,0,1,0,0,2,0,0,0],["KVB-Hauptwerkstatt Weidenpesch"]], // Neuss./Sollmann
  [[0,2,1,2,0,2,5,1,0,0,1,0,0,0],["St. Agatha Krankenhaus","Güterbahnhof Niehl","Hotel-Restaurant Bürgerhof","Miramar"]], // Niehl
  [[0,1,0,0,0,2,3,5,1,0,0,1,0,0],["Latio"]], // Pesch
  [[0,0,0,0,1,5,2,16,0,2,1,0,0,1],["Loft","EFRA Lichtwerbung"]], // Peter Bauer
  [[0,0,0,0,0,0,2,15,0,2,0,0,0,1],["Blastrac"]], // Rich.-Byrd
  [[0,0,1,0,4,0,4,3,0,0,0,2,0,0],["Tagesklinik Pionierstraße","Villa Bodinus","LATIBUL"]], // Riehl
  [[0,2,0,0,2,12,21,10,0,1,0,6,1,3],["Zauberschule & Theater","Kulturkirche Köln","1st floor hotel","Hotel Stadt Viersen","Kemmerling KG"]], // Scharnhorst
  [[1,1,2,0,4,10,23,27,2,1,2,11,0,0],["Köln-Ehrenfeld","Sankt Franzikus-Hospital","KfH-Nierenzentrum","artheater","Urania Theater"]], // Subbelrath
  [[0,0,0,0,2,1,4,6,0,4,0,0,0,0],["Alte Wursterei, disdance project","Loft","EFRA Lichtwerbung"]], // SVA
  null, // Widdersdorf
  [[0,1,0,2,1,2,4,10,1,2,1,2,0,0],["Güterbahnhof Bickendorf","AXA - Celik & Kollegen","Hotel Anke"]], // Wilh-Mauser
  [[1,1,0,0,0,0,2,0,0,0,0,0,0,0],["Köln-Worringen","Haus Odendahl"]], // Worringen S-Bahn
  [[0,0,0,0,3,0,2,0,0,0,0,1,0,0],["Zoo Event","Flora"]], // Zoo Bedarfs
  [[0,0,0,0,0,0,1,5,0,0,0,0,0,0],[]], // ABC-Tower
  [[0,0,0,0,0,0,3,1,0,0,2,1,0,0],[]], // Brück
  [[1,1,0,0,0,4,0,3,1,16,0,2,0,0],["Köln-Buchforst","Provinzial - Lars Lessenich","Leonardo Hotel","Acla-Werke"]], // Buchforst
  [[0,1,0,0,0,6,6,3,0,0,0,4,0,0],["PLAZA Premium Köln"]], // Clevischer Ring
  [[0,0,0,0,0,2,10,2,1,0,3,6,0,0],["Allianz"]], // Dellbrück
  [[2,13,0,1,1,6,12,22,1,0,1,4,0,0],["Köln Messe/Deutz","Köln Messe/Deutz (tief)","Zentrum zeitgenössische Stadtentwicklung","Bahnhof Köln Messe/Deutz","Techniker Krankenkasse"]], // Deutz Bhf
  [[0,6,0,5,3,0,3,6,0,0,0,0,0,0],["Messe Köln","LANXESS arena","Alte Wagenhalle","Dorint An der Messe","Hotel Radisson Blu"]], // Dorint Messe
  [[0,0,0,0,0,0,3,2,1,0,0,1,0,0],["Allianz"]], // Dünnwald
  [[0,0,0,1,0,1,3,4,1,0,1,1,0,0],["Rangierbahnhof Gremberg","Continentale"]], // Ensen
  [[0,12,1,2,2,7,9,25,4,0,0,14,0,0],["Eduardus-Krankenhaus","LANXESS arena","Zentrum zeitgenössische Stadtentwicklung","Bahnhof Köln Messe/Deutz","Debeka-Servicebüro Köln"]], // Gotenring
  null, // Grengel
  [[0,0,0,2,0,5,2,6,1,1,0,1,0,0],["Köln-Kalk Nord","Ergo","Kronenbrot"]], // Höhenberg
  null, // Höhenhaus
  [[0,1,0,0,2,2,3,1,1,0,0,3,0,0],["Cassiopeia Theater","Mietkneipe","AXA Thomas Frank","Hotel Zagreb"]], // Holweide
  [[0,0,1,0,0,0,1,2,0,0,0,0,0,0],["Krankenhaus Holweide"]], // Holweide
  [[0,1,0,1,0,1,5,1,0,0,0,0,0,0],["Köln-Kalk","Ars Vivendi"]], // Humboldt
  null, // Hyatt
  [[1,1,1,1,2,3,10,9,0,2,0,1,2,0],["Köln Trimbornstraße","MY HEALTH & BEAUTY","Halle Kalk","Kulturhof Kalk","Köln-Kalk"]], // Kalk Karree
  [[1,4,1,1,1,10,11,4,0,1,0,0,2,1],["Köln Trimbornstraße","MY HEALTH & BEAUTY","Halle Kalk","Köln Deutzerfeld","Hotel Arena"]], // Kalk Post
  [[1,4,1,1,3,11,15,9,1,1,0,3,2,1],["Köln Trimbornstraße","MY HEALTH & BEAUTY","Halle Kalk","Kulturhof Kalk","Köln-Kalk"]], // Kapelle
  [[1,4,1,1,3,11,15,9,1,1,0,3,2,1],["Köln Trimbornstraße","MY HEALTH & BEAUTY","Halle Kalk","Kulturhof Kalk","Köln-Kalk"]], // Kaufhof Kalk
  [[0,0,1,0,0,0,0,0,0,0,0,1,0,1],["Krankenhaus Köln-Merheim"]], // Klinikum
  [[0,0,0,0,0,0,4,3,2,0,0,0,0,0],["DEVK-Büro mit Sparda-Filaile"]], // Königsforst
  [[0,0,0,1,0,1,1,0,0,1,0,0,0,0],["KVB Betriebshof Merheim"]], // Merheim
  [[1,1,0,0,0,5,7,7,0,14,0,1,0,0],["Köln-Mülheim","Köln City Hotel","Acla-Werke"]], // Mülheim Bhf
  [[0,4,1,0,0,7,7,19,3,0,2,8,2,1],["LVR-Klinik Köln, Mülheim","Concordia Versicherungen","Hotel Kaiser am Wienerplatz","the niu Mill","Woolworth"]], // Ostheim
  [[0,0,0,2,0,3,3,6,0,1,2,5,0,0],["Köln-Deutz Hafen","Schütte"]], // Poll
  [[1,0,1,1,0,0,0,0,0,0,1,1,0,0],["Köln Steinstraße","Krankenhaus Porz am Rhein","DB Cargo Werk Köln-Gremberg"]], // Porz-Krhs.
  [[1,1,1,0,1,1,9,24,3,0,1,18,1,0],["Porz (Rhein)","promenta Tagesklinik","Kino in der Glashütte","Provinzial","Garner"]], // Porz-Mitte
  [[0,4,0,4,2,0,2,5,0,0,0,0,0,0],["PALASTZELT AN DER ZOOBRÜCKE","Messe Köln","Betriebswerk Köln-Deutzerfeld","Ibis Hotel Köln Messe","Ibis Budget Köln Messe"]], // Radisson
  [[1,3,0,1,1,1,5,9,1,3,0,3,0,0],["Köln-Dellbrück","Slide Cologne","Bahnhof Dellbrück","Generali Subdirektion Pilgram","UHU-Gästehaus"]], // S-Bahn Dellbrück
  [[0,1,0,0,6,3,17,12,1,0,0,1,0,5],["Schauspiel Köln im Depot 1 und 2","Schauspiel Köln Grotte","AOK","Moxy"]], // Schanzenstr.
  [[1,0,0,0,0,2,1,0,0,0,0,0,0,0],["Köln-Stammheim"]], // Stammheim
  [[0,0,0,0,0,1,0,1,0,0,3,4,0,0],[]], // Straßburger
  [[0,1,0,0,0,1,3,6,2,0,0,2,0,0],["AXA Center","SMARTY Hotel"]], // Urbach
  [[0,0,0,0,0,1,2,0,0,1,1,2,0,0],["Kronenbrot"]], // Vingst
  [[2,9,0,5,2,5,10,17,2,0,0,8,0,0],["Köln Messe/Deutz","Köln Messe/Deutz (tief)","LANXESS arena","Zentrum zeitgenössische Stadtentwicklung","Bahnhof Köln Messe/Deutz"]], // W.-Brandt-Platz
  [[2,1,0,0,2,0,1,0,0,0,0,0,0,0],["Wahn S-Bahn","Porz-Wahn","Gut Eltzhof / Theatermuseum","aegidium","Loginn"]], // Wahn (Bhf)
  [[0,4,1,0,0,7,7,19,3,0,2,8,2,1],["LVR-Klinik Köln, Mülheim","Concordia Versicherungen","Hotel Kaiser am Wienerplatz","the niu Mill","Woolworth"]], // Wiener Platz
  null, // Zündorf
  [[2,35,2,0,15,33,84,34,1,0,0,4,4,1],["Köln Hauptbahnhof","Breslauer Platz/Hbf","Lasikwelt Augenlaserzentrum","Ärztehaus Heumarkt","Klaus-von-Bismarck-Saal"]], // Am Hof
  null, // Barbarossaplatz
  [[0,16,4,0,11,6,38,37,6,0,2,4,11,1],["Reisepraxis Köln","PAN Klinik am Neumarkt","Theater am Dom","Oper der Stadt Köln","Barmenia Versicherungen"]], // Breite Str.
  [[1,9,2,0,17,37,82,19,1,0,0,4,0,3],["Köln West","Privatklinik Dr. Stettner","T-Klinik am Rudolfplatz","Theaterpädagisches Zentrum","Hinterhofsalon"]], // Brüsseler
  [[2,32,1,0,15,14,51,37,1,0,1,3,3,1],["Köln Hauptbahnhof","Breslauer Platz/Hbf","Lasikwelt Augenlaserzentrum","Klaus-von-Bismarck-Saal","Museum für Angewandte Kunst"]], // Burgmauer
  [[0,6,2,2,8,30,69,26,2,0,1,13,0,2],["Tagesklink Alteburger Straße","Kunsthaus Kat18","Altes Pfandhaus","Güterbahnhof Bonntor","Allianz Wirtz"]], // Chlodwigplatz
  null, // Barcelo, Hotel
  [[0,18,3,0,14,35,63,45,5,0,2,6,7,2],["Tagesklinik am Friesenplatz","Reisepraxis Köln","Kabarett Klüngelpütz","Gloria Theater","Allianz Davide Ciaccia"]], // Helenenstr.
  null, // Ebertplatz
  [[0,15,1,0,16,55,74,38,1,1,0,6,1,1],["Tagesklinik am Friesenplatz","Rex am Ring","Scala-Theater","Scor","Ruby Ella"]], // Friesenplatz
  [[0,15,2,0,5,13,19,47,6,0,0,2,1,1],["Tagesklinik am Hansaring","Tagesklinik am Friesenplatz","Erstes Kölner Wohnzimmertheater","Residenz - ASTOR Film Lounge","HUK-Coburg"]], // Gereonsdriesch
  [[0,17,3,0,22,43,94,36,2,0,0,8,0,3],["Privatklinik Dr. Stettner","T-Klinik am Rudolfplatz","Hohenzollern Saal","SMS - Secret Magic Show - Zaubertheater","Barmenia Versicherung - Frank Kramer"]], // Habsburgerring
  [[1,9,2,0,8,49,67,18,1,0,0,5,0,6],["Köln Süd","Klinik am Ring","MVZ für Gefäßmedizin und Venenchirurgie","NightWash Club","Off Broadway"]], // Herz Jesu
  [[0,34,2,0,12,52,72,44,1,0,0,5,3,2],["Ärztehaus Heumarkt","Beginenfenster","Hänneschen-Theater","IKK classic","Maritim Hotel"]], // Heumarkt
  [[2,27,2,0,9,8,24,19,1,0,0,4,0,2],["Breslauer Platz/Hbf","Köln Hauptbahnhof","MVZ St. Marien","St. Marien-Hospital","Kokett Bar"]], // Hilton Köln
  [[0,13,1,0,16,54,71,38,1,1,0,5,0,1],["Tagesklinik am Friesenplatz","Rex am Ring","Scala-Theater","Scor","Ruby Ella"]], // Hohenzollernring
  [[2,27,2,0,9,8,24,19,1,0,0,4,0,2],["Breslauer Platz/Hbf","Köln Hauptbahnhof","MVZ St. Marien","St. Marien-Hospital","Kokett Bar"]], // Johannis
  [[0,9,3,0,8,8,27,38,3,1,0,2,0,4],["Tagesklinik am Hansaring","Forum Klinik","Residenz - ASTOR Film Lounge","Erstes Kölner Wohnzimmertheater","Debeka"]], // K.-W.-Ring
  [[0,16,4,0,14,27,44,46,3,0,0,7,4,4],["Ärztehaus Heumarkt","Lasikwelt Augenlaserzentrum","Gürzenich","Anno 1858","IKK classic"]], // Kaufhof
  [[0,6,0,0,4,2,14,21,2,0,1,2,0,3],["Literaturhaus Köln","Wolkenburg","Allianz Global Corporate & Spec","Koncept Hotel International","Premier Inn Köln City Süd"]], // Kaygasse
  [[0,14,5,0,16,51,105,40,3,0,0,8,5,1],["Tagesklinik am Friesenplatz","Reisepraxis Köln","7th Space Köln","Filmpalast Köln","Barmenia Versicherung - Frank Kramer"]], // Kettengasse
  [[0,0,2,2,8,3,6,18,0,0,1,5,0,1],["MV-Zentrum für Onkologie und Hämatologie","Orangerie","Theater am Sachsenring - TAS","Köln Bonntor"]], // Kleingedank
  [[0,22,2,0,8,43,44,43,1,0,0,4,1,2],["Ärztehaus Heumarkt","Anno 1858","Beginenfenster","IKK classic","Hotel zur Malzmühle"]], // Maritim
  [[0,9,3,0,8,8,27,38,3,1,0,2,0,4],["Tagesklinik am Hansaring","Forum Klinik","Residenz - ASTOR Film Lounge","Erstes Kölner Wohnzimmertheater","Debeka"]], // Mediapark
  [[0,9,4,0,16,44,68,30,2,0,0,7,0,6],["MVZ für Gefäßmedizin und Venenchirurgie","Klinik am Ring","NightWash Club","theater im hof","Techniker Krankenkasse"]], // Mozart
  [[2,31,2,0,13,42,82,30,2,0,0,4,3,1],["Köln Hauptbahnhof","Breslauer Platz/Hbf","Ärztehaus Heumarkt","Lasikwelt Augenlaserzentrum","Senftöpfchen"]], // Mühlengasse
  [[0,6,4,0,13,4,41,38,7,0,0,18,9,1],["ARTEMIS Augen- und Laserklinik Köln","PAN Klinik am Neumarkt","Schauspielhaus Köln","Außenspielstätte am Offenbachplatz","Barmer"]], // Neumarkt
  [[0,15,4,0,14,4,36,34,5,0,2,16,11,1],["Lasikwelt Augenlaserzentrum","ARTEMIS Augen- und Laserklinik Köln","Außenspielstätte am Offenbachplatz","Oper der Stadt Köln","Barmenia Versicherungen"]], // Oper
  [[2,28,1,0,11,38,72,23,2,0,0,3,2,0],["Breslauer Platz/Hbf","Köln Hauptbahnhof","Ärztehaus Heumarkt","Kölner Philharmonie","Senftöpfchen"]], // Philharmonie
  [[0,17,3,0,22,43,94,36,2,0,0,8,0,3],["Privatklinik Dr. Stettner","T-Klinik am Rudolfplatz","Hohenzollern Saal","SMS - Secret Magic Show - Zaubertheater","Barmenia Versicherung - Frank Kramer"]], // Pilgrimstr.
  [[0,3,0,0,2,5,11,11,2,0,0,1,1,3],["Metropolis","Horizont Theater","Mecure","Mercure Hotel","Mrs Goodwill"]], // Reichensperger
  [[0,18,2,0,16,48,86,52,4,0,0,8,5,2],["Tagesklinik am Friesenplatz","Reisepraxis Köln","Rex am Ring","Scala-Theater","Allianz Davide Ciaccia"]], // Renaissance
  [[0,11,2,0,9,12,10,39,2,0,1,5,0,2],["Ärztehaus Heumarkt","Bel Etage","Anno 1858","Nürnberger Versicherung","Hotel Lyskirchen"]], // Rheinau
  [[0,18,2,0,12,43,71,50,4,0,0,6,5,2],["Tagesklinik am Friesenplatz","Reisepraxis Köln","Rex am Ring","Scala-Theater","Allianz Davide Ciaccia"]], // Römergasse
  [[0,12,3,0,21,36,81,39,6,0,0,8,3,3],["T-Klinik am Rudolfplatz","Privatklinik Dr. Stettner","7th Space Köln","Kino 813","Barmenia Versicherung - Frank Kramer"]], // Rudolfplatz
  [[0,4,1,0,7,5,12,10,1,0,2,0,0,2],["Odeon","Kunsthaus Rhenania","Nürnberger Versicherung","Mercure Severinshof","Premier Inn Köln City Süd"]], // Severinshof
  [[0,15,2,0,5,15,15,37,3,0,2,5,1,4],["Ärztehaus Heumarkt","Bariton Lounge","Literaturhaus Köln","Provinzial","Hotel Heinzelmännchen"]], // Waidmarkt
  [[0,4,1,0,5,14,41,20,1,0,1,4,0,3],["Klinik am Ring","Wolkenburg","NightWash Club","Allianz","Ibis Köln Centrum"]], // Weyerstr.
  [[0,2,0,2,4,4,2,7,0,0,0,0,0,1],["COMEDIA Theater","Orangerie","Köln Bonntor","Hotel Christina","TAGUNGS- UND GÄSTEHAUS ST. GEORG"]], // Zentrale
  [[1,9,2,0,8,49,67,18,1,0,0,5,0,6],["Köln Süd","Klinik am Ring","MVZ für Gefäßmedizin und Venenchirurgie","NightWash Club","Off Broadway"]], // Zülpicher Platz
];

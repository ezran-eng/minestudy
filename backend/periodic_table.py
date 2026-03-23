"""
Periodic Table data for Redo AI tutor context.

Provides element lookup so Redo can answer questions about chemical elements
in the context of mining engineering (mineralogy, metallurgy, geochemistry).
"""

ELEMENTS = {
    "H":  {"Z": 1,   "name": "Hidrógeno",    "cat": "No metal",        "mass": 1.008,    "config": "1s¹",                    "mining": "Usado en hidrometalurgia y como reductor"},
    "He": {"Z": 2,   "name": "Helio",         "cat": "Gas noble",       "mass": 4.003,    "config": "[He]",                   "mining": "Gas inerte, usado en soldadura especializada"},
    "Li": {"Z": 3,   "name": "Litio",         "cat": "Alcalino",        "mass": 6.941,    "config": "[He]2s¹",                "mining": "Mineral clave: espodumeno, petalita. Baterías de litio"},
    "Be": {"Z": 4,   "name": "Berilio",       "cat": "Alcalinotérreo",  "mass": 9.012,    "config": "[He]2s²",                "mining": "Mineral: berilo. Aleaciones aeroespaciales"},
    "B":  {"Z": 5,   "name": "Boro",          "cat": "Metaloide",       "mass": 10.81,    "config": "[He]2s²2p¹",             "mining": "Bórax, usado en vidrio y cerámica"},
    "C":  {"Z": 6,   "name": "Carbono",       "cat": "No metal",        "mass": 12.011,   "config": "[He]2s²2p²",             "mining": "Diamante industrial, grafito. Reductor en siderurgia"},
    "N":  {"Z": 7,   "name": "Nitrógeno",     "cat": "No metal",        "mass": 14.007,   "config": "[He]2s²2p³",             "mining": "Explosivos (ANFO), atmósfera inerte en procesamiento"},
    "O":  {"Z": 8,   "name": "Oxígeno",       "cat": "No metal",        "mass": 15.999,   "config": "[He]2s²2p⁴",             "mining": "Oxidación de minerales, proceso de flotación"},
    "F":  {"Z": 9,   "name": "Flúor",         "cat": "Halógeno",        "mass": 18.998,   "config": "[He]2s²2p⁵",             "mining": "Fluorita (CaF₂), fundente en metalurgia"},
    "Ne": {"Z": 10,  "name": "Neón",          "cat": "Gas noble",       "mass": 20.180,   "config": "[He]2s²2p⁶",             "mining": "Sin uso directo en minería"},
    "Na": {"Z": 11,  "name": "Sodio",         "cat": "Alcalino",        "mass": 22.990,   "config": "[Ne]3s¹",                "mining": "NaCN en lixiviación de oro, NaOH en procesamiento"},
    "Mg": {"Z": 12,  "name": "Magnesio",      "cat": "Alcalinotérreo",  "mass": 24.305,   "config": "[Ne]3s²",                "mining": "Magnesita, dolomita. Refractarios"},
    "Al": {"Z": 13,  "name": "Aluminio",      "cat": "Post-transición", "mass": 26.982,   "config": "[Ne]3s²3p¹",             "mining": "Bauxita→alúmina→aluminio (Bayer+Hall-Héroult)"},
    "Si": {"Z": 14,  "name": "Silicio",       "cat": "Metaloide",       "mass": 28.086,   "config": "[Ne]3s²3p²",             "mining": "Cuarzo, silicatos. Base de la mayoría de minerales de ganga"},
    "P":  {"Z": 15,  "name": "Fósforo",       "cat": "No metal",        "mass": 30.974,   "config": "[Ne]3s²3p³",             "mining": "Apatita, fosforita. Fertilizantes"},
    "S":  {"Z": 16,  "name": "Azufre",        "cat": "No metal",        "mass": 32.065,   "config": "[Ne]3s²3p⁴",             "mining": "Sulfuros metálicos (pirita, calcopirita). Ácido sulfúrico"},
    "Cl": {"Z": 17,  "name": "Cloro",         "cat": "Halógeno",        "mass": 35.453,   "config": "[Ne]3s²3p⁵",             "mining": "Cloruración de oro, HCl en lixiviación"},
    "Ar": {"Z": 18,  "name": "Argón",         "cat": "Gas noble",       "mass": 39.948,   "config": "[Ne]3s²3p⁶",             "mining": "Atmósfera protectora en soldadura y fundición"},
    "K":  {"Z": 19,  "name": "Potasio",       "cat": "Alcalino",        "mass": 39.098,   "config": "[Ar]4s¹",                "mining": "Silvita, carnalita. Fertilizantes potásicos"},
    "Ca": {"Z": 20,  "name": "Calcio",        "cat": "Alcalinotérreo",  "mass": 40.078,   "config": "[Ar]4s²",                "mining": "Calcita, cal viva. Regulador de pH, fundente"},
    "Sc": {"Z": 21,  "name": "Escandio",      "cat": "Transición",      "mass": 44.956,   "config": "[Ar]3d¹4s²",             "mining": "Subproducto de tierras raras. Aleaciones de aluminio"},
    "Ti": {"Z": 22,  "name": "Titanio",       "cat": "Transición",      "mass": 47.867,   "config": "[Ar]3d²4s²",             "mining": "Ilmenita, rutilo. Pigmento TiO₂, aleaciones"},
    "V":  {"Z": 23,  "name": "Vanadio",       "cat": "Transición",      "mass": 50.942,   "config": "[Ar]3d³4s²",             "mining": "Subproducto de magnetita. Aceros de alta resistencia"},
    "Cr": {"Z": 24,  "name": "Cromo",         "cat": "Transición",      "mass": 51.996,   "config": "[Ar]3d⁵4s¹",             "mining": "Cromita. Acero inoxidable, cromado"},
    "Mn": {"Z": 25,  "name": "Manganeso",     "cat": "Transición",      "mass": 54.938,   "config": "[Ar]3d⁵4s²",             "mining": "Pirolusita. Desulfurante en acería, baterías"},
    "Fe": {"Z": 26,  "name": "Hierro",        "cat": "Transición",      "mass": 55.845,   "config": "[Ar]3d⁶4s²",             "mining": "Hematita, magnetita. Metal más producido del mundo"},
    "Co": {"Z": 27,  "name": "Cobalto",       "cat": "Transición",      "mass": 58.933,   "config": "[Ar]3d⁷4s²",             "mining": "Subproducto de Cu/Ni. Baterías Li-ion, superaleaciones"},
    "Ni": {"Z": 28,  "name": "Níquel",        "cat": "Transición",      "mass": 58.693,   "config": "[Ar]3d⁸4s²",             "mining": "Pentlandita, garnierita. Acero inoxidable, baterías"},
    "Cu": {"Z": 29,  "name": "Cobre",         "cat": "Transición",      "mass": 63.546,   "config": "[Ar]3d¹⁰4s¹",            "mining": "Calcopirita, malaquita. Conductor eléctrico, flotación"},
    "Zn": {"Z": 30,  "name": "Zinc",          "cat": "Transición",      "mass": 65.380,   "config": "[Ar]3d¹⁰4s²",            "mining": "Esfalerita. Galvanizado, aleaciones (latón)"},
    "Ga": {"Z": 31,  "name": "Galio",         "cat": "Post-transición", "mass": 69.723,   "config": "[Ar]3d¹⁰4s²4p¹",         "mining": "Subproducto de aluminio. Semiconductores"},
    "Ge": {"Z": 32,  "name": "Germanio",      "cat": "Metaloide",       "mass": 72.640,   "config": "[Ar]3d¹⁰4s²4p²",         "mining": "Subproducto de zinc. Fibra óptica, electrónica"},
    "As": {"Z": 33,  "name": "Arsénico",      "cat": "Metaloide",       "mass": 74.922,   "config": "[Ar]3d¹⁰4s²4p³",         "mining": "Arsenopirita. Contaminante en drenaje ácido de mina"},
    "Se": {"Z": 34,  "name": "Selenio",       "cat": "No metal",        "mass": 78.960,   "config": "[Ar]3d¹⁰4s²4p⁴",         "mining": "Subproducto de refinación de cobre"},
    "Br": {"Z": 35,  "name": "Bromo",         "cat": "Halógeno",        "mass": 79.904,   "config": "[Ar]3d¹⁰4s²4p⁵",         "mining": "Usado en lixiviación de oro como alternativa al cianuro"},
    "Kr": {"Z": 36,  "name": "Kriptón",       "cat": "Gas noble",       "mass": 83.798,   "config": "[Ar]3d¹⁰4s²4p⁶",         "mining": "Sin uso directo en minería"},
    "Rb": {"Z": 37,  "name": "Rubidio",       "cat": "Alcalino",        "mass": 85.468,   "config": "[Kr]5s¹",                "mining": "Subproducto de litio/cesio"},
    "Sr": {"Z": 38,  "name": "Estroncio",     "cat": "Alcalinotérreo",  "mass": 87.620,   "config": "[Kr]5s²",                "mining": "Celestina, estroncianita. Pirotecnia, imanes de ferrita"},
    "Y":  {"Z": 39,  "name": "Itrio",         "cat": "Transición",      "mass": 88.906,   "config": "[Kr]4d¹5s²",             "mining": "Mineral de tierras raras. Cerámicas, láseres"},
    "Zr": {"Z": 40,  "name": "Circonio",      "cat": "Transición",      "mass": 91.224,   "config": "[Kr]4d²5s²",             "mining": "Circón. Refractarios, reactores nucleares"},
    "Nb": {"Z": 41,  "name": "Niobio",        "cat": "Transición",      "mass": 92.906,   "config": "[Kr]4d⁴5s¹",             "mining": "Columbita. Aceros HSLA, superconductores"},
    "Mo": {"Z": 42,  "name": "Molibdeno",     "cat": "Transición",      "mass": 95.960,   "config": "[Kr]4d⁵5s¹",             "mining": "Molibdenita. Subproducto de cobre. Aceros especiales"},
    "Tc": {"Z": 43,  "name": "Tecnecio",      "cat": "Transición",      "mass": 98,       "config": "[Kr]4d⁵5s²",             "mining": "Elemento artificial, sin presencia natural significativa"},
    "Ru": {"Z": 44,  "name": "Rutenio",       "cat": "Transición",      "mass": 101.07,   "config": "[Kr]4d⁷5s¹",             "mining": "Grupo del platino. Catalizadores, electrónica"},
    "Rh": {"Z": 45,  "name": "Rodio",         "cat": "Transición",      "mass": 102.91,   "config": "[Kr]4d⁸5s¹",             "mining": "PGM. Catalizadores automotrices, muy valioso"},
    "Pd": {"Z": 46,  "name": "Paladio",       "cat": "Transición",      "mass": 106.42,   "config": "[Kr]4d¹⁰",               "mining": "PGM. Catalizadores, electrónica, joyería"},
    "Ag": {"Z": 47,  "name": "Plata",         "cat": "Transición",      "mass": 107.87,   "config": "[Kr]4d¹⁰5s¹",            "mining": "Argentita, galena argentífera. Mejor conductor eléctrico"},
    "Cd": {"Z": 48,  "name": "Cadmio",        "cat": "Transición",      "mass": 112.41,   "config": "[Kr]4d¹⁰5s²",            "mining": "Subproducto de zinc. Baterías NiCd, contaminante"},
    "In": {"Z": 49,  "name": "Indio",         "cat": "Post-transición", "mass": 114.82,   "config": "[Kr]4d¹⁰5s²5p¹",         "mining": "Subproducto de zinc. Pantallas táctiles (ITO)"},
    "Sn": {"Z": 50,  "name": "Estaño",        "cat": "Post-transición", "mass": 118.71,   "config": "[Kr]4d¹⁰5s²5p²",         "mining": "Casiterita. Soldadura, hojalata, aleaciones"},
    "Sb": {"Z": 51,  "name": "Antimonio",     "cat": "Metaloide",       "mass": 121.76,   "config": "[Kr]4d¹⁰5s²5p³",         "mining": "Estibina. Retardante de llama, aleaciones de plomo"},
    "Te": {"Z": 52,  "name": "Telurio",       "cat": "Metaloide",       "mass": 127.60,   "config": "[Kr]4d¹⁰5s²5p⁴",         "mining": "Subproducto de cobre. Paneles solares (CdTe)"},
    "I":  {"Z": 53,  "name": "Yodo",          "cat": "Halógeno",        "mass": 126.90,   "config": "[Kr]4d¹⁰5s²5p⁵",         "mining": "Salmueras. Medicina, desinfección"},
    "Xe": {"Z": 54,  "name": "Xenón",         "cat": "Gas noble",       "mass": 131.29,   "config": "[Kr]4d¹⁰5s²5p⁶",         "mining": "Gas raro, iluminación especializada"},
    "Cs": {"Z": 55,  "name": "Cesio",         "cat": "Alcalino",        "mass": 132.91,   "config": "[Xe]6s¹",                "mining": "Polucita. Fluidos de perforación de alta densidad"},
    "Ba": {"Z": 56,  "name": "Bario",         "cat": "Alcalinotérreo",  "mass": 137.33,   "config": "[Xe]6s²",                "mining": "Barita. Lodo de perforación, densificante"},
    "La": {"Z": 57,  "name": "Lantano",       "cat": "Lantánido",       "mass": 138.91,   "config": "[Xe]5d¹6s²",             "mining": "Bastnäsita. Catalizadores de refinación de petróleo"},
    "Ce": {"Z": 58,  "name": "Cerio",         "cat": "Lantánido",       "mass": 140.12,   "config": "[Xe]4f¹5d¹6s²",          "mining": "REE más abundante. Pulido de vidrio, catalizadores"},
    "Pr": {"Z": 59,  "name": "Praseodimio",   "cat": "Lantánido",       "mass": 140.91,   "config": "[Xe]4f³6s²",             "mining": "Imanes NdFeB, colorante cerámico amarillo"},
    "Nd": {"Z": 60,  "name": "Neodimio",      "cat": "Lantánido",       "mass": 144.24,   "config": "[Xe]4f⁴6s²",             "mining": "Imanes permanentes más potentes (NdFeB)"},
    "Pm": {"Z": 61,  "name": "Prometio",      "cat": "Lantánido",       "mass": 145,      "config": "[Xe]4f⁵6s²",             "mining": "Radiactivo, sin uso minero directo"},
    "Sm": {"Z": 62,  "name": "Samario",       "cat": "Lantánido",       "mass": 150.36,   "config": "[Xe]4f⁶6s²",             "mining": "Imanes SmCo para alta temperatura"},
    "Eu": {"Z": 63,  "name": "Europio",       "cat": "Lantánido",       "mass": 151.96,   "config": "[Xe]4f⁷6s²",             "mining": "Fósforos rojos, billetes de seguridad"},
    "Gd": {"Z": 64,  "name": "Gadolinio",     "cat": "Lantánido",       "mass": 157.25,   "config": "[Xe]4f⁷5d¹6s²",          "mining": "Contraste en MRI, barras de control nuclear"},
    "Tb": {"Z": 65,  "name": "Terbio",        "cat": "Lantánido",       "mass": 158.93,   "config": "[Xe]4f⁹6s²",             "mining": "Fósforos verdes, imanes"},
    "Dy": {"Z": 66,  "name": "Disprosio",     "cat": "Lantánido",       "mass": 162.50,   "config": "[Xe]4f¹⁰6s²",            "mining": "Crítico para imanes NdFeB resistentes al calor"},
    "Ho": {"Z": 67,  "name": "Holmio",        "cat": "Lantánido",       "mass": 164.93,   "config": "[Xe]4f¹¹6s²",            "mining": "Láseres, barras de control nuclear"},
    "Er": {"Z": 68,  "name": "Erbio",         "cat": "Lantánido",       "mass": 167.26,   "config": "[Xe]4f¹²6s²",            "mining": "Amplificadores de fibra óptica, colorante rosa"},
    "Tm": {"Z": 69,  "name": "Tulio",         "cat": "Lantánido",       "mass": 168.93,   "config": "[Xe]4f¹³6s²",            "mining": "Rayos X portátiles, muy escaso"},
    "Yb": {"Z": 70,  "name": "Iterbio",       "cat": "Lantánido",       "mass": 173.05,   "config": "[Xe]4f¹⁴6s²",            "mining": "Metalurgia, mejora de acero inoxidable"},
    "Lu": {"Z": 71,  "name": "Lutecio",       "cat": "Lantánido",       "mass": 174.97,   "config": "[Xe]4f¹⁴5d¹6s²",         "mining": "PET scan, catalizadores. REE más pesado"},
    "Hf": {"Z": 72,  "name": "Hafnio",        "cat": "Transición",      "mass": 178.49,   "config": "[Xe]4f¹⁴5d²6s²",         "mining": "Se separa del circonio. Barras de control nuclear"},
    "Ta": {"Z": 73,  "name": "Tantalio",      "cat": "Transición",      "mass": 180.95,   "config": "[Xe]4f¹⁴5d³6s²",         "mining": "Coltan. Capacitores electrónicos, mineral de conflicto"},
    "W":  {"Z": 74,  "name": "Wolframio",     "cat": "Transición",      "mass": 183.84,   "config": "[Xe]4f¹⁴5d⁴6s²",         "mining": "Wolframita, scheelita. Herramientas de corte, punto fusión más alto"},
    "Re": {"Z": 75,  "name": "Renio",         "cat": "Transición",      "mass": 186.21,   "config": "[Xe]4f¹⁴5d⁵6s²",         "mining": "Subproducto de molibdeno. Superaleaciones de turbina"},
    "Os": {"Z": 76,  "name": "Osmio",         "cat": "Transición",      "mass": 190.23,   "config": "[Xe]4f¹⁴5d⁶6s²",         "mining": "PGM, más denso de los elementos. Aleaciones duras"},
    "Ir": {"Z": 77,  "name": "Iridio",        "cat": "Transición",      "mass": 192.22,   "config": "[Xe]4f¹⁴5d⁷6s²",         "mining": "PGM. Más resistente a la corrosión, bujías"},
    "Pt": {"Z": 78,  "name": "Platino",       "cat": "Transición",      "mass": 195.08,   "config": "[Xe]4f¹⁴5d⁹6s¹",         "mining": "Sperrylita. Catalizadores, joyería, inversión"},
    "Au": {"Z": 79,  "name": "Oro",           "cat": "Transición",      "mass": 196.97,   "config": "[Xe]4f¹⁴5d¹⁰6s¹",        "mining": "Oro nativo, lixiviación con cianuro/tiosulfato. Inversión"},
    "Hg": {"Z": 80,  "name": "Mercurio",      "cat": "Transición",      "mass": 200.59,   "config": "[Xe]4f¹⁴5d¹⁰6s²",        "mining": "Cinabrio. Amalgamación (en desuso). Contaminante"},
    "Tl": {"Z": 81,  "name": "Talio",         "cat": "Post-transición", "mass": 204.38,   "config": "[Xe]4f¹⁴5d¹⁰6s²6p¹",     "mining": "Subproducto, altamente tóxico. Superconductores"},
    "Pb": {"Z": 82,  "name": "Plomo",         "cat": "Post-transición", "mass": 207.20,   "config": "[Xe]4f¹⁴5d¹⁰6s²6p²",     "mining": "Galena. Baterías ácido-plomo, protección radiológica"},
    "Bi": {"Z": 83,  "name": "Bismuto",       "cat": "Post-transición", "mass": 208.98,   "config": "[Xe]4f¹⁴5d¹⁰6s²6p³",     "mining": "Bismutinita. Reemplazo no tóxico del plomo"},
    "Po": {"Z": 84,  "name": "Polonio",       "cat": "Post-transición", "mass": 209,      "config": "[Xe]4f¹⁴5d¹⁰6s²6p⁴",     "mining": "Radiactivo, fuentes alfa. Eliminadores estáticos"},
    "At": {"Z": 85,  "name": "Astato",        "cat": "Halógeno",        "mass": 210,      "config": "[Xe]4f¹⁴5d¹⁰6s²6p⁵",     "mining": "Extremadamente raro, sin uso minero"},
    "Rn": {"Z": 86,  "name": "Radón",         "cat": "Gas noble",       "mass": 222,      "config": "[Xe]4f¹⁴5d¹⁰6s²6p⁶",     "mining": "Gas radiactivo en minas subterráneas, riesgo laboral"},
    "Fr": {"Z": 87,  "name": "Francio",       "cat": "Alcalino",        "mass": 223,      "config": "[Rn]7s¹",                "mining": "Extremadamente raro e inestable"},
    "Ra": {"Z": 88,  "name": "Radio",         "cat": "Alcalinotérreo",  "mass": 226,      "config": "[Rn]7s²",                "mining": "Radiactivo. Históricamente en pinturas luminosas"},
    "Ac": {"Z": 89,  "name": "Actinio",       "cat": "Actínido",        "mass": 227,      "config": "[Rn]6d¹7s²",             "mining": "Radiactivo, fuente de neutrones"},
    "Th": {"Z": 90,  "name": "Torio",         "cat": "Actínido",        "mass": 232.04,   "config": "[Rn]6d²7s²",             "mining": "Monacita. Combustible nuclear alternativo"},
    "Pa": {"Z": 91,  "name": "Protactinio",   "cat": "Actínido",        "mass": 231.04,   "config": "[Rn]5f²6d¹7s²",          "mining": "Muy raro, sin uso comercial"},
    "U":  {"Z": 92,  "name": "Uranio",        "cat": "Actínido",        "mass": 238.03,   "config": "[Rn]5f³6d¹7s²",          "mining": "Uraninita, carnotita. Combustible nuclear, ISR/open pit"},
    "Np": {"Z": 93,  "name": "Neptunio",      "cat": "Actínido",        "mass": 237,      "config": "[Rn]5f⁴6d¹7s²",          "mining": "Artificial, subproducto de reactores nucleares"},
    "Pu": {"Z": 94,  "name": "Plutonio",      "cat": "Actínido",        "mass": 244,      "config": "[Rn]5f⁶7s²",             "mining": "Artificial, combustible nuclear y armamento"},
    "Am": {"Z": 95,  "name": "Americio",      "cat": "Actínido",        "mass": 243,      "config": "[Rn]5f⁷7s²",             "mining": "Detectores de humo, fuentes de neutrones"},
    "Cm": {"Z": 96,  "name": "Curio",         "cat": "Actínido",        "mass": 247,      "config": "[Rn]5f⁷6d¹7s²",          "mining": "Artificial, generadores termoeléctricos espaciales"},
    "Bk": {"Z": 97,  "name": "Berkelio",      "cat": "Actínido",        "mass": 247,      "config": "[Rn]5f⁹7s²",             "mining": "Artificial, solo investigación"},
    "Cf": {"Z": 98,  "name": "Californio",    "cat": "Actínido",        "mass": 251,      "config": "[Rn]5f¹⁰7s²",            "mining": "Fuente de neutrones para análisis de minerales"},
    "Es": {"Z": 99,  "name": "Einstenio",     "cat": "Actínido",        "mass": 252,      "config": "[Rn]5f¹¹7s²",            "mining": "Artificial, solo investigación"},
    "Fm": {"Z": 100, "name": "Fermio",        "cat": "Actínido",        "mass": 257,      "config": "[Rn]5f¹²7s²",            "mining": "Artificial, solo investigación"},
    "Md": {"Z": 101, "name": "Mendelevio",    "cat": "Actínido",        "mass": 258,      "config": "[Rn]5f¹³7s²",            "mining": "Artificial, solo investigación"},
    "No": {"Z": 102, "name": "Nobelio",       "cat": "Actínido",        "mass": 259,      "config": "[Rn]5f¹⁴7s²",            "mining": "Artificial, solo investigación"},
    "Lr": {"Z": 103, "name": "Lawrencio",     "cat": "Actínido",        "mass": 266,      "config": "[Rn]5f¹⁴7s²7p¹",         "mining": "Artificial, solo investigación"},
    "Rf": {"Z": 104, "name": "Rutherfordio",  "cat": "Transición",      "mass": 267,      "config": "[Rn]5f¹⁴6d²7s²",         "mining": "Artificial, solo investigación"},
    "Db": {"Z": 105, "name": "Dubnio",        "cat": "Transición",      "mass": 268,      "config": "[Rn]5f¹⁴6d³7s²",         "mining": "Artificial, solo investigación"},
    "Sg": {"Z": 106, "name": "Seaborgio",     "cat": "Transición",      "mass": 269,      "config": "[Rn]5f¹⁴6d⁴7s²",         "mining": "Artificial, solo investigación"},
    "Bh": {"Z": 107, "name": "Bohrio",        "cat": "Transición",      "mass": 270,      "config": "[Rn]5f¹⁴6d⁵7s²",         "mining": "Artificial, solo investigación"},
    "Hs": {"Z": 108, "name": "Hasio",         "cat": "Transición",      "mass": 277,      "config": "[Rn]5f¹⁴6d⁶7s²",         "mining": "Artificial, solo investigación"},
    "Mt": {"Z": 109, "name": "Meitnerio",     "cat": "Transición",      "mass": 278,      "config": "[Rn]5f¹⁴6d⁷7s²",         "mining": "Artificial, solo investigación"},
    "Ds": {"Z": 110, "name": "Darmstatio",    "cat": "Transición",      "mass": 281,      "config": "[Rn]5f¹⁴6d⁸7s²",         "mining": "Artificial, solo investigación"},
    "Rg": {"Z": 111, "name": "Roentgenio",    "cat": "Transición",      "mass": 282,      "config": "[Rn]5f¹⁴6d⁹7s²",         "mining": "Artificial, solo investigación"},
    "Cn": {"Z": 112, "name": "Copernicio",    "cat": "Transición",      "mass": 285,      "config": "[Rn]5f¹⁴6d¹⁰7s²",        "mining": "Artificial, solo investigación"},
    "Nh": {"Z": 113, "name": "Nihonio",       "cat": "Post-transición", "mass": 286,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p¹",     "mining": "Artificial, solo investigación"},
    "Fl": {"Z": 114, "name": "Flerovio",      "cat": "Post-transición", "mass": 289,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p²",     "mining": "Artificial, solo investigación"},
    "Mc": {"Z": 115, "name": "Moscovio",      "cat": "Post-transición", "mass": 290,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p³",     "mining": "Artificial, solo investigación"},
    "Lv": {"Z": 116, "name": "Livermorio",    "cat": "Post-transición", "mass": 293,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p⁴",     "mining": "Artificial, solo investigación"},
    "Ts": {"Z": 117, "name": "Teneso",        "cat": "Halógeno",        "mass": 294,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p⁵",     "mining": "Artificial, solo investigación"},
    "Og": {"Z": 118, "name": "Oganesón",      "cat": "Gas noble",       "mass": 294,      "config": "[Rn]5f¹⁴6d¹⁰7s²7p⁶",     "mining": "Artificial, solo investigación"},
}


def lookup_element(symbol_or_name: str) -> dict | None:
    """Look up an element by symbol or Spanish name (case-insensitive)."""
    key = symbol_or_name.strip()
    # Try direct symbol match
    if key in ELEMENTS:
        return {"symbol": key, **ELEMENTS[key]}
    # Try case-insensitive symbol
    for sym, data in ELEMENTS.items():
        if sym.lower() == key.lower():
            return {"symbol": sym, **data}
    # Try name match
    key_lower = key.lower()
    for sym, data in ELEMENTS.items():
        if data["name"].lower() == key_lower:
            return {"symbol": sym, **data}
    return None


def element_context_for_llm(symbol: str) -> str:
    """Return a compact string with element info for LLM context injection."""
    el = lookup_element(symbol)
    if not el:
        return ""
    return (
        f"{el['symbol']} (Z={el['Z']}) {el['name']} — {el['cat']}, "
        f"masa {el['mass']}, config {el['config']}. "
        f"En minería: {el['mining']}"
    )


def search_elements(query: str) -> list[dict]:
    """Search elements by partial name, symbol, or mining application."""
    q = query.lower()
    results = []
    for sym, data in ELEMENTS.items():
        if (q in sym.lower()
            or q in data["name"].lower()
            or q in data["cat"].lower()
            or q in data["mining"].lower()):
            results.append({"symbol": sym, **data})
    return results[:10]

#!/usr/bin/env python3
"""Generate sections 4-10 of the flashcards."""

# This will be appended to gen.py's data

# ============================================================
# SECTION 4: Regular Verbs -ar/-er/-ir (cards 351-475)
# ============================================================
def ar_conj(root):
    return {"present":{"yo":root+"o","tú":root+"as","él":root+"a","nosotros":root+"amos","vosotros":root+"áis","ellos":root+"an"},
            "preterite":{"yo":root+"é","tú":root+"aste","él":root+"ó","nosotros":root+"amos","vosotros":root+"asteis","ellos":root+"aron"},
            "imperfect":{"yo":root+"aba","tú":root+"abas","él":root+"aba","nosotros":root+"ábamos","vosotros":root+"abais","ellos":root+"aban"}}

def er_conj(root):
    return {"present":{"yo":root+"o","tú":root+"es","él":root+"e","nosotros":root+"emos","vosotros":root+"éis","ellos":root+"en"},
            "preterite":{"yo":root+"í","tú":root+"iste","él":root+"ió","nosotros":root+"imos","vosotros":root+"isteis","ellos":root+"ieron"},
            "imperfect":{"yo":root+"ía","tú":root+"ías","él":root+"ía","nosotros":root+"íamos","vosotros":root+"íais","ellos":root+"ían"}}

def ir_conj(root):
    return {"present":{"yo":root+"o","tú":root+"es","él":root+"e","nosotros":root+"imos","vosotros":root+"ís","ellos":root+"en"},
            "preterite":{"yo":root+"í","tú":root+"iste","él":root+"ió","nosotros":root+"imos","vosotros":root+"isteis","ellos":root+"ieron"},
            "imperfect":{"yo":root+"ía","tú":root+"ías","él":root+"ía","nosotros":root+"íamos","vosotros":root+"íais","ellos":root+"ían"}}

regular_ar = [
    ("hablar","to speak","habl","Hablo español y portugués.","I speak Spanish and Portuguese.",["conversar","charlar"]),
    ("caminar","to walk","camin","Camino al trabajo todos los días.","I walk to work every day.",["andar"]),
    ("estudiar","to study","estudi","Estudio para el examen de mañana.","I study for tomorrow's exam.",[]),
    ("trabajar","to work","trabaj","Trabajo en una oficina.","I work in an office.",["laborar"]),
    ("cocinar","to cook","cocin","Cocino la cena para mi familia.","I cook dinner for my family.",["preparar"]),
    ("comprar","to buy","compr","Compro frutas en el mercado.","I buy fruits at the market.",["adquirir"]),
    ("bailar","to dance","bail","Bailo salsa los fines de semana.","I dance salsa on weekends.",[]),
    ("cantar","to sing","cant","Canta muy bien.","She sings very well.",["entonar"]),
    ("nadar","to swim","nad","Nado en la piscina cada mañana.","I swim in the pool every morning.",[]),
    ("viajar","to travel","viaj","Viajo a México el próximo mes.","I travel to Mexico next month.",[]),
    ("escuchar","to listen","escuch","Escucho música mientras trabajo.","I listen to music while I work.",["oír"]),
    ("buscar","to look for","busc","Busco mis llaves en la casa.","I look for my keys in the house.",[]),
    ("llamar","to call","llam","Llamo a mi madre todos los días.","I call my mother every day.",["telefonear"]),
    ("llevar","to carry / to wear","llev","Llevo una mochila al colegio.","I carry a backpack to school.",["portar"]),
    ("pagar","to pay","pag","Pago la cuenta con tarjeta.","I pay the bill with a card.",["abonar"]),
    ("esperar","to wait / to hope","esper","Espero el autobús en la esquina.","I wait for the bus at the corner.",["aguardar"]),
    ("entrar","to enter","entr","Entro a la oficina a las ocho.","I enter the office at eight.",[]),
    ("llegar","to arrive","lleg","Llego a casa a las seis.","I arrive home at six.",[]),
    ("preguntar","to ask","pregunt","Pregunto la dirección a un policía.","I ask a police officer for directions.",["interrogar"]),
    ("contestar","to answer","contest","Contesto todas las preguntas.","I answer all the questions.",["responder"]),
    ("limpiar","to clean","limpi","Limpio la casa los sábados.","I clean the house on Saturdays.",["asear"]),
    ("necesitar","to need","necesit","Necesito más tiempo.","I need more time.",["requerir","precisar"]),
    ("enseñar","to teach","enseñ","Enseño matemáticas en la universidad.","I teach mathematics at the university.",["instruir"]),
    ("descansar","to rest","descans","Descanso después del almuerzo.","I rest after lunch.",["reposar"]),
    ("amar","to love","am","Amo a mi familia.","I love my family.",["querer"]),
    ("ayudar","to help","ayud","Ayudo a mis vecinos con las compras.","I help my neighbors with shopping.",["asistir","auxiliar"]),
    ("terminar","to finish","termin","Termino el trabajo a las cinco.","I finish work at five.",["acabar","finalizar"]),
    ("cenar","to have dinner","cen","Ceno a las nueve de la noche.","I have dinner at nine at night.",[]),
    ("desayunar","to have breakfast","desayun","Desayuno a las siete de la mañana.","I have breakfast at seven in the morning.",[]),
    ("dibujar","to draw","dibuj","Dibujo paisajes en mi tiempo libre.","I draw landscapes in my free time.",["trazar"]),
    ("ganar","to win / to earn","gan","Gano un buen sueldo.","I earn a good salary.",["obtener"]),
    ("guardar","to keep / to save","guard","Guardo los documentos en un cajón.","I keep the documents in a drawer.",["conservar"]),
    ("mejorar","to improve","mejor","Mejoro mi español cada día.","I improve my Spanish every day.",["perfeccionar"]),
    ("olvidar","to forget","olvid","Olvido siempre las llaves.","I always forget my keys.",[]),
    ("usar","to use","us","Uso el ordenador para trabajar.","I use the computer to work.",["utilizar","emplear"]),
]

regular_er = [
    ("comer","to eat","com","Como una ensalada para almorzar.","I eat a salad for lunch.",["alimentarse"]),
    ("beber","to drink","beb","Bebo mucha agua durante el día.","I drink a lot of water during the day.",["tomar"]),
    ("leer","to read","le","Leo un libro antes de dormir.","I read a book before sleeping.",[]),
    ("aprender","to learn","aprend","Aprendo italiano en una academia.","I learn Italian at an academy.",[]),
    ("comprender","to understand","comprend","Comprendo la lección perfectamente.","I understand the lesson perfectly.",["entender"]),
    ("correr","to run","corr","Corro cinco kilómetros cada mañana.","I run five kilometers every morning.",[]),
    ("vender","to sell","vend","Vendo ropa en mi tienda.","I sell clothes in my store.",[]),
    ("responder","to respond","respond","Respondo a los correos electrónicos.","I respond to emails.",["contestar"]),
    ("creer","to believe","cre","Creo que tiene razón.","I believe she is right.",[]),
    ("meter","to put in","met","Meto la ropa en la lavadora.","I put the clothes in the washing machine.",["introducir"]),
    ("deber","to owe / must","deb","Debo estudiar para el examen.","I must study for the exam.",[]),
    ("prometer","to promise","promet","Prometo llegar a tiempo.","I promise to arrive on time.",[]),
    ("barrer","to sweep","barr","Barro el piso de la cocina.","I sweep the kitchen floor.",[]),
    ("toser","to cough","tos","Toso mucho cuando tengo resfriado.","I cough a lot when I have a cold.",[]),
    ("tejer","to knit / to weave","tej","Mi abuela teje bufandas de lana.","My grandmother knits wool scarves.",[]),
]

regular_ir_verbs = [
    ("vivir","to live","viv","Vivo en una ciudad grande.","I live in a big city.",["habitar","residir"]),
    ("escribir","to write","escrib","Escribo una carta a mi amigo.","I write a letter to my friend.",["redactar"]),
    ("abrir","to open","abr","Abro la ventana por la mañana.","I open the window in the morning.",[]),
    ("subir","to go up / upload","sub","Subo las escaleras corriendo.","I go up the stairs running.",["ascender"]),
    ("recibir","to receive","recib","Recibo muchos correos al día.","I receive many emails per day.",["obtener"]),
    ("decidir","to decide","decid","Decido qué cocinar para la cena.","I decide what to cook for dinner.",["determinar","resolver"]),
    ("compartir","to share","compart","Comparto mi almuerzo con mi compañero.","I share my lunch with my classmate.",[]),
    ("discutir","to discuss / argue","discut","Discutimos los planes del proyecto.","We discuss the project plans.",["debatir"]),
    ("describir","to describe","describ","Describo el paisaje en mi diario.","I describe the landscape in my diary.",["detallar"]),
    ("existir","to exist","exist","No existen pruebas suficientes.","There are no sufficient proofs.",[]),
    ("asistir","to attend","asist","Asisto a clase todos los días.","I attend class every day.",["acudir"]),
    ("sufrir","to suffer","sufr","Sufro de alergias en primavera.","I suffer from allergies in spring.",["padecer"]),
    ("permitir","to allow","permit","No permito que hablen así.","I don't allow them to speak like that.",["autorizar","dejar"]),
    ("insistir","to insist","insist","Insisto en pagar la cuenta.","I insist on paying the bill.",[]),
    ("consumir","to consume","consum","Consumo productos locales.","I consume local products.",["gastar"]),
]

# The data will be processed in the main assembly script

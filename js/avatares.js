/* Biblioteca de avatares: 6 bloques × 8 personajes (4 varones + 4 mujeres).
   Dos bloques por franja de edad: 12-13, 14-15 y 16-18 años. */
window.PP_AVATARES = {
  bloques: [
    { n: 1, nombre: "Bloque 1 · 12-13 años", sugerido: "1°-2° año" },
    { n: 2, nombre: "Bloque 2 · 12-13 años", sugerido: "1°-2° año" },
    { n: 3, nombre: "Bloque 3 · 14-15 años", sugerido: "2°-3° año" },
    { n: 4, nombre: "Bloque 4 · 14-15 años", sugerido: "3°-4° año" },
    { n: 5, nombre: "Bloque 5 · 16-18 años", sugerido: "4°-5° año" },
    { n: 6, nombre: "Bloque 6 · 16-18 años", sugerido: "5°-6° año" }
  ],
  url: function (bloque, i) { return "avatares/b" + bloque + "-" + (i + 1) + ".webp"; },
  boti: "avatares/boti.webp",
  cantidad: 8
};

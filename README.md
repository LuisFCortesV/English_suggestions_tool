# English Register Suggestions

Herramienta web que ayuda a hispanohablantes a mejorar su forma de escribir en
inglés. El usuario escribe una palabra o frase y recibe sugerencias en distintos
registros (formal / neutral / informal), cada una con una explicación en español.
Sin login.

- **Formal (Oxford):** siempre presente; si el original ya es la forma más
  formal posible, se indica con un marcador verde.
- **Neutral / Informal:** solo cuando aportan una variante natural distinta.

## Arquitectura

- **Frontend:** HTML/CSS/JavaScript vanilla (sin frameworks de UI), en `frontend/`.
- **Backend:** Node.js + Express, en `backend/`. La integración con la API de
  Gemini está aislada en `backend/src/llm/`, detrás de una única interfaz
  (`generateSuggestions`). Los prompts viven como constantes en
  `backend/src/llm/prompts.js`.
- **Sin base de datos:** no se persisten peticiones ni sugerencias.

La especificación, el plan y el contrato de la API están en
`specs/001-english-register-suggestions/`.

## Configuración

> **La clave de Gemini nunca se sube al repositorio.** Se configura por
> variables de entorno en `backend/.env`, que está excluido por `.gitignore`.

```bash
cd backend
npm install
cp .env.example .env        # en PowerShell: Copy-Item .env.example .env
# edita .env y coloca tu GEMINI_API_KEY
```

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `GEMINI_API_KEY` | sí | — | Clave de la API de Gemini; el servidor no arranca sin ella |
| `PORT` | no | 3000 | Puerto HTTP |
| `GEMINI_MODEL` | no | gemini-2.5-flash | Modelo usado para la generación |

## Ejecutar

```bash
cd backend
npm start          # http://localhost:3000
```

## Pruebas

```bash
cd backend
npm test           # node:test; la SDK de Gemini está mockeada (no requiere clave ni red)
```

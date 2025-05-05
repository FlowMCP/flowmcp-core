import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Validation } from './../src/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root-Verzeichnis mit deinen Schema-Dateien
const baseDir = path.join(__dirname, './../schemas/v1.2.0');

const results = [];

async function findSchemasWithEnumOptions(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await findSchemasWithEnumOptions(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.mjs')) {
      try {
        const module = await import(pathToFileURL(fullPath));
        const { schema } = module.default || module;


        if (!schema?.routes || typeof schema.routes !== 'object') continue;

        for (const [routeName, routeDef] of Object.entries(schema.routes)) {
          const parameters = routeDef?.parameters;
          if (!Array.isArray(parameters)) continue;

          for (let i = 0; i < parameters.length; i++) {
            const param = parameters[i];
            const z = param?.z;

            if (z?.options && Array.isArray(z.options)) {
              const hasEnum = z.options.some(opt =>
                typeof opt === 'string' && opt.trim().startsWith('enum(')
              );

              if (hasEnum) {
                const relativePath = path.relative(baseDir, fullPath);
                results.push({
                  File: relativePath,
                  Route: routeName,
                  Parameter: `param[${i}]`,
                });
              }
            }
          }
        }

      } catch (err) {
        console.warn(`⚠️ Fehler beim Laden von ${fullPath}: ${err.message}`);
      }
    }
  }
}

await findSchemasWithEnumOptions(baseDir);

// 📋 Ausgabe als Tabelle
if (results.length) {
  console.table(results);
} else {
  console.log('❌ Keine enum() Vorkommen gefunden.');
}

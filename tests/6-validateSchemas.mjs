import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { FlowMCP, Validation } from './../src/index.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.join(__dirname, './../schemas/v1.2.0');

const results = [];

async function validateAllSchemas(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await validateAllSchemas(fullPath);
    } else if (entry.isFile() && fullPath.endsWith('.mjs')) {
      const relativePath = path.relative(baseDir, fullPath);
      let schemaOk = '❌';
      let interfacesOk = '❌';

      try {
        const module = await import(pathToFileURL(fullPath));
        const { schema } = module.default || module;

        if (!schema) {
          results.push({ File: relativePath, 'Schema OK': '❌', Interfaces: '❌' });
          continue;
        }

        try {
          Validation.schema({ schema });
          schemaOk = '✅';
        } catch {
          schemaOk = '❌';
        }

        try {
            const a = FlowMCP.getZodInterfaces({ schema });
            interfacesOk = '✅';
        } catch(e) {
          interfacesOk = '❌';
        }

        results.push({ File: relativePath, 'Schema OK': schemaOk, Interfaces: interfacesOk });

      } catch (err) {
        results.push({ File: relativePath, 'Schema OK': '❌', Interfaces: '❌' });
      }
    }
  }
}

await validateAllSchemas(baseDir);

// 📋 Ausgabe als Tabelle
if (results.length) {
  console.log('\n📊 Übersicht aller Schemas:\n');
  console.table(results);
} else {
  console.log('❌ Keine Schemas gefunden.');
}

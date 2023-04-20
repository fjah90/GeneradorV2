const upperCaseEntityName = require("../utls/camel-case-entity");
const fs = require("fs");

async function generateEntity(
  entityName,
  tableName,
  tableSchema,
  columns,
  moduleType
) {
  console.log("Generating Entity...");
  const isMs = moduleType == "ms";
  const entityTitle = upperCaseEntityName(entityName, "entity");

  let entityColumns = "";

  for (const item of columns) {
    let {
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      translatedColumn,
      typeString,
      isPK,
    } = item;

    entityColumns += `
      @${isPK ? "PrimaryColumn" : "Column"}({
          type: '${data_type}',
          name: '${column_name}',
          ${character_maximum_length
        ? `length: '${character_maximum_length}',`
        : ""
      }
          ${numeric_precision ? `precision: ${numeric_precision}` : ""}
      })
      ${translatedColumn}: ${typeString ? typeString.value : data_type};
      `;
  }

  const document = `import {Column, Entity, PrimaryColumn} from "typeorm";
    @Entity("${tableName}", { schema: "${tableSchema}" })
    export class ${entityTitle} {
        ${entityColumns}
    }`;

  if (isMs) {
    fs.writeFileSync(process.cwd() +
      `/results/${moduleType}/${entityName}/entity/${entityName}.entity.ts`,
      document,
      err => {
        if (err) {
          console.log('Error writing file', err)
        } else {
          console.log("Entity Created at ",
            `results/${moduleType}/${entityName}/entity/${entityName}.entity.ts`
          );
        }
      }
    );
  }
}

module.exports = generateEntity;
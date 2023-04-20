const fs = require("fs");
const upperCaseEntityName = require("../utls/camel-case-entity");

async function generateDto(entityName, entityFieldsArray, moduleType, isMsOnly) {
  console.log("Generating DTO...");
  const isGt = moduleType == "gt";
  const isOnlyMS = isMsOnly;
  const dtoTitle = upperCaseEntityName(entityName, "dto");
  const searchFieldsDTOTitle = upperCaseEntityName(entityName, "searchFields");

  const hasMultiplePKs =
    entityFieldsArray.filter((field) => field.isPK).length > 1;

  let fields = "";
  let searchFields = "";
  let importValidators = ``;

  for (let index = 0; index < entityFieldsArray.length; index++) {
    const {
      column_name,
      data_type,
      character_maximum_length,
      numeric_precision,
      isPK,
      translatedColumn,
    } = entityFieldsArray[index];

    let max = "9".repeat(+numeric_precision);

    if (
      data_type == "numeric" ||
      data_type == "smallint" ||
      data_type == "integer"
    ) {
      if (!importValidators.includes("IsNumber")) {
        importValidators += "IsNumber, ";
      }

      if (!importValidators.includes("Max")) {
        importValidators += "Max, ";
      }

      if (isPK) {
        searchFields += `
        @Type(() => Number)
        @IsNumber({}, { message: Message.NUMBER("$property") })
        ${numeric_precision != null
            ? `@Max(${max}, { message: "El maximo valor de ${column_name} debe ser ${max}" })`
            : `@Max(9999999999, { message: "El maximo valor de ${column_name} debe ser 9999999999" })`
          }
        ${isGt || isOnlyMS && !isGt
            ? `@ApiProperty({ title: "${column_name}", example: "Dato de tipo numérico", required: false })`
            : ""
          }
        ${translatedColumn}: number
        `;
      }

      fields += `
      @Type(() => Number)
        @IsNumber({}, { message: Message.NUMBER("$property") })
        ${numeric_precision != null
          ? `@Max(${max}, { message: "El maximo valor de ${column_name} debe ser ${max}" })`
          : `@Max(9999999999, { message: "El maximo valor de ${column_name} debe ser 9999999999" })`
        }
        ${isPK ? "@IsOptional()" : ""}
        ${isGt || isOnlyMS && !isGt
          ? `@ApiProperty({ title: "${column_name}", example: "Dato de tipo numérico", required: false })`
          : ""
        }
        ${translatedColumn}: number;
        `;
    }

    if (
      data_type == "character varying" ||
      data_type == "text" ||
      data_type == "character"
    ) {
      if (!importValidators.includes("IsString")) {
        importValidators += "IsString, ";
      }

      if (!importValidators.includes("Length")) {
        importValidators += "Length, ";
      }

      if (isPK) {
        searchFields += `
        @Type(() => String)
        @IsString({ message: Message.STRING("$property") })
        ${character_maximum_length != null
            ? `@Length(1, ${character_maximum_length}, { message: Message.LENGTH("$property", "$constraint1 $constraint2")})`
            : ""
          }
        ${isGt || isOnlyMS && !isGt
            ? `@ApiProperty({ title: "${column_name}", example: "Dato de tipo texto", required: false })`
            : ""
          }
        ${translatedColumn}: string;
        `;
      }

      fields += `
        @Type(() => String)
        @IsString({ message: Message.STRING("$property") })
        ${character_maximum_length != null
          ? `@Length(1, ${character_maximum_length}, { message: Message.LENGTH("$property", "$constraint1 $constraint2")})`
          : ""
        }
        ${isPK ? "@IsOptional()" : ""}
        ${isGt || isOnlyMS && !isGt
          ? `@ApiProperty({ title: "${column_name}", example: "Dato de tipo texto", required: false })`
          : ""
        }
        ${translatedColumn}: string;
        `;
    }

    if (data_type == "date") {
      if (!importValidators.includes("IsDate")) importValidators += "IsDate, ";

      if (isPK) {
        searchFields += `
        @Type(() => Date)
        @IsDate({ message: Message.IsDate('$property') })
        ${isGt || isOnlyMS && !isGt
            ? `@ApiProperty({ title: '${column_name}', example: 'Dato de tipo fecha' })`
            : ""
          }
        ${translatedColumn}: Date;
        `;
      }

      fields += `
        @Type(() => Date)
        @IsDate({ message: Message.IsDate('$property') })
        ${isPK ? "@IsOptional()" : ""}
        ${isGt || isOnlyMS && !isGt
          ? `@ApiProperty({ title: '${column_name}', example: 'Dato de tipo fecha' })`
          : ""
        }
        ${translatedColumn}: Date;
        `;
    }
  }

  const document = `${isGt || isOnlyMS && !isGt ? `import { ApiProperty } from '@nestjs/swagger';` : ""}
    import { Message } from 'sigebi-lib-common';
    import {Type} from 'class-transformer';
    import { IsOptional, ${importValidators} } from 'class-validator';

    export class ${dtoTitle} {
      ${fields}
    }

    ${hasMultiplePKs
      ? `export class ${searchFieldsDTOTitle} {
        ${searchFields}
      }`
      : ""
    }`;

  fs.writeFileSync(
    process.cwd() + `/results/${moduleType}/${entityName}/dto/${entityName}.dto.ts`,
    document,
    err => {
      if (err) {
        console.log('Error writing file', err)
      } else {
        console.log("Created DTO at ", `results/${entityName}/dto/${entityName}.dto.ts`);
      }
    }
  );
}

module.exports = generateDto;
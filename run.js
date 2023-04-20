const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const rimraf = require("rimraf");
const generateEntity = require("./lib/generate-entity");
const generateDto = require("./lib/generate-dto");
const generateService = require("./lib/generate-service");
const generateController = require("./lib/generate-controller");
const generateModule = require("./lib/generate-module");
const translateField = require("./lib/translate");
const exec = require("child_process").exec;

require("dotenv").config();


if (!fs.existsSync(process.cwd() + "\\results\\")) fs.mkdirSync(process.cwd() + "\\results");

const generateModuleEntity = async (entity, connection) => {
  const tableSchema = entity.schema.toLowerCase();
  const tableName = entity.table.toLowerCase();
  const entityName = entity.entityFileName.includes("_") ? entity.entityFileName.replaceAll("_", "-").toLowerCase() : entity.entityFileName.toLowerCase();
  const moduleType = entity.moduleType.toLowerCase();
  const isMsOnly = entity.isMsOnly ?? false;

  await deletedModuleFolder(moduleType);
  await createdModuleFolder(moduleType);

  if (!tableSchema || !tableName || !entityName || !moduleType)
    throw new Error(
      "all flag related to entity like table, schema and name its required for this program"
    );

  const { rows: columns } = await connection.query(
    `SELECT column_name,data_type,character_maximum_length, numeric_precision FROM information_schema.columns WHERE table_schema = '${tableSchema}' AND table_name = '${tableName}'`
  );

  if (columns.length == 0) {
    throw new Error("No columns find in that table");
  }

  const { rows: constraints } = await connection.query(
    `SELECT column_name, constraint_name FROM information_schema.constraint_column_usage WHERE table_schema = '${tableSchema}' AND table_name = '${tableName}'`
  );

  console.log("Table", tableName, "------->>>", columns.length);

  const types = [
    { type: "numeric", value: "number" },
    { type: "bigint", value: "number" },
    { type: "smallint", value: "number" },
    { type: "integer", value: "number" },
    { type: "double precision", value: "number" },
    { type: "character varying", value: "string" },
    { type: "text", value: "string" },
    { type: "character", value: "string" },
    { type: "date", value: "Date" },
    { type: "timestamp", value: "Date" },
  ];

  const columnsInfo = [];

  for (const column of columns) {
    const { column_name, data_type } = column;

    const translatedColumn = await translateField(column_name, "en");

    let isPK = false;

    for (let index = 0; index < constraints.length; index++) {
      const constraint = constraints[index];
      isPK =
        constraint.column_name == column_name &&
        constraint.constraint_name.toLowerCase().includes("pk");
      if (isPK) break;
    }

    let typeString = types.find((item) => item.type === data_type);

    columnsInfo.push({ ...column, isPK, translatedColumn, typeString });
  }

  console.log("after column processed", columnsInfo.length);

  createdModuleFolder(moduleType);

  fs.mkdirSync(path.join(__dirname, `/results/${moduleType}/${entityName}`));
  fs.mkdirSync(path.join(__dirname, `/results/${moduleType}/${entityName}/dto`));
  if (moduleType === "ms") {
    fs.mkdirSync(path.join(__dirname, `/results/${moduleType}/${entityName}/entity`));
    await generateEntity(
      entityName,
      tableName,
      tableSchema,
      columnsInfo,
      moduleType
    );
  }

  await generateDto(entityName, columnsInfo, moduleType, isMsOnly);
  await generateService(entityName, columnsInfo, moduleType, isMsOnly);
  await generateController(entityName, columnsInfo, moduleType, isMsOnly);
  await generateModule(entityName, moduleType);
};

async function deletedModuleFolder(moduleType) {
  if (fs.existsSync(process.cwd() + `\\results\\${moduleType}`)) {
    console.log(`Deleting modules ${moduleType}...`);
    await rimraf(path.join(__dirname + `\\results\\${moduleType}`));
  }
}

async function createdModuleFolder(moduleType) {
  if (!fs.existsSync(process.cwd() + `\\results\\${moduleType}`))
    return fs.mkdirSync(process.cwd() + `\\results\\${moduleType}`);
}

async function generateStructure(entities, moduleType, schema, isMsOnly) {

  try {
    console.log("Conexion DB Initialized");

    const db = process.env.DB_NAME;
    const host = process.env.DB_HOST;
    const dbUser = process.env.DB_USER;
    const password = process.env.DB_PASS;
    const port = process.env.DB_PORT;

    const connection = new Client({
      host: host,
      user: dbUser,
      password: password,
      database: db,
      port: port,
      ssl: true,
    });

    await connection.connect();

    console.log("Generate-Module Initialized");
    flag = false;
    for (let index = 0; index < entities.length; index++) {
      const element = entities[index];
      await generateModuleEntity(
        { ...element, moduleType, schema, isMsOnly },
        connection
      );
      if (index == (entities.length - 1) && !isMsOnly && moduleType != "gt") {
        console.log("FINISHED PROCESS FOR LOOP 1");
        moduleType = "gt"
        flag = true;
      }
    }

    if (!isMsOnly && flag && moduleType == "gt") {
      for (let index = 0; index < entities.length; index++) {
        const element = entities[index];
        await generateModuleEntity(
          { ...element, moduleType, schema, isMsOnly },
          connection
        );
        if (index == (entities.length - 1)) {
          await exec("npm run format", (err, stdout, stderr) => {
            if (err) {
              console.log(err);
            }
            console.log("FORMAT FINISHED");
            connection.end();
            console.log("FINISHED PROCESS GENERATE STRUCTURE MS AND GT");
          });
        }
      }
    } else {
      await exec("npm run format", (err, stdout, stderr) => {
        if (err) {
          console.log(err);
        }
        console.log("FORMAT FINISHED");
        connection.end();
        console.log("FINISHED PROCESS GENERATE STRUCTURE " + moduleType);
      });
    }
  } catch (error) {
    console.log("Error", error.message);
    throw error;
  }
}

module.exports = generateStructure;
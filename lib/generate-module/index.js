const upperCaseEntityName = require("../utls/camel-case-entity");
const fs = require("fs");

async function generateModule(entityName, moduleType) {
  console.log("Generating Module File...");
  const isGt = moduleType == "gt";
  const controllerTitle = upperCaseEntityName(entityName, "controller");
  const serviceTitle = upperCaseEntityName(entityName, "service");
  const entityTitle = upperCaseEntityName(entityName, "entity");
  const moduleTitle = upperCaseEntityName(entityName, "module");
  const clientTitle = entityName.replaceAll("-", "_").toUpperCase();

  let document = `import { Module } from '@nestjs/common';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { CommonFilterService } from 'src/shared/services/common-filter.service';
    import { ${controllerTitle} } from './${entityName}.controller';
    import { ${serviceTitle} } from './${entityName}.service';
    import { ${entityTitle} } from './entity/${entityName}.entity';

    @Module({
      imports: [TypeOrmModule.forFeature([${entityTitle}])],
      controllers: [${controllerTitle}],
      providers: [${serviceTitle}, CommonFilterService],
    })
    export class ${moduleTitle} {}`;

  if (isGt) {
    document = `import { Module } from '@nestjs/common';
    import { ${controllerTitle} } from './${entityName}.controller';
    import { ClientsModule, Transport} from '@nestjs/microservices';
    import { ${serviceTitle} } from './${entityName}.service';
    @Module({
      imports: [
        ClientsModule.register([
          {
            name: '${clientTitle}_SERVICE',
            transport: Transport.TCP,
            options: {
              host: '127.0.0.1',
              port: 3001,
            },
          }
        ]),
      ],
      controllers: [${controllerTitle}],
      providers: [${serviceTitle}]
    })
    export class ${moduleTitle} {}`;
  }

  fs.writeFileSync(`${process.cwd()}/results/${moduleType}/${entityName}/${entityName}.module.ts`,
    document,
    err => {
      if (err) {
        console.log('Error writing file', err)
      } else {
        console.log("Generated Module File at ", `results/${entityName}/${entityName}.module.ts`);
      }
    }
  );
}

module.exports = generateModule;
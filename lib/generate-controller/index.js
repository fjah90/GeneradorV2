const fs = require("fs");
const upperCaseEntityName = require("../utls/camel-case-entity");

async function generateController(
  entityName,
  entityColumnsInfo,
  moduleType,
  isMsOnly
) {
  console.log("Generating Controller...");

  const isMs = moduleType == "ms" && !isMsOnly;
  const dtoTitle = upperCaseEntityName(entityName, "dto");
  const searchFieldsDTOTitle = upperCaseEntityName(entityName, "searchFields");
  const serviceTitle = upperCaseEntityName(entityName, "service");
  const controllerTitle = upperCaseEntityName(entityName, "controller");
  const normalTitle = upperCaseEntityName(entityName);

  const hasMultiplePKs = entityColumnsInfo.filter((column) => column.isPK).length > 1;

  const singlePK = hasMultiplePKs ? entityColumnsInfo.find((column) => column.isPK) : false;

  let document = `import { Controller } from '@nestjs/common';
    import { Body, Delete, Get, Put, Post, Param} from '@nestjs/common/decorators';
    import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags} from '@nestjs/swagger';
    import { ${dtoTitle} ${hasMultiplePKs ? `, ${searchFieldsDTOTitle}` : ``}} from './dto/${entityName}.dto';
    import { ${serviceTitle} } from './${entityName}.service';

    import { Paginate, PaginateQuery } from 'nestjs-paginate';

    @Controller('${entityName}')
    @ApiTags('${entityName}')
    export class ${controllerTitle} {
      constructor(private readonly service: ${serviceTitle}) {}

      @ApiOperation({ summary: 'Paginación de todos los registros' })
    @ApiResponse({
      status: 200,
      type: [${dtoTitle}],
    })
    @ApiQuery({
      name: 'page',
      description: 'Número de página',
      type: Number,
      required: false,
    })
    @ApiQuery({
      name: 'limit',
      description: 'Limite de elementos',
      type: Number,
      required: false,
    })
    @ApiQuery({
      name: 'search',
      description: 'Texto a buscar',
      type: String,
      required: false,
    })
    @Get()
    async getAll(@Paginate() query: PaginateQuery) {
      return await this.service.getAll(query);
    }

    ${hasMultiplePKs
      ? `@ApiOperation({ summary: 'Busca por su identificador' })
    @ApiBody({
      type: ${searchFieldsDTOTitle}
    })
    @ApiResponse({
      status: 200,
      type: ${dtoTitle},
    })
    @Post('find-by-ids')
    async getByIds(@Body() searchFields: ${searchFieldsDTOTitle}) {
      return await this.service.getByIds(searchFields);
    }`
      : `@ApiOperation({ summary: 'Busca por su identificador' })
        @ApiParam({
          name: 'id',
          description: 'Busca por su identificador',
        })
        @ApiResponse({
          status: 200,
          type: ${dtoTitle},
        })
        @Get(':id')
        async getByIds(@Param('id') id: any) {
          return await this.service.getByIds(id);
        }`
    }

    @ApiOperation({ summary: 'Guardar nuevo registro' })
    @ApiBody({ type: ${dtoTitle} })
    @ApiResponse({
      status: 200,
      description: 'Guarda un nuevo registro',
      type: ${dtoTitle},
    })
    @Post()
    async createRegistry(@Body() dto: ${dtoTitle}) {
      return await this.service.createRegistry(dto);
    }

    ${hasMultiplePKs
      ? `@ApiOperation({ summary: 'Actualiza un registro' })
    @ApiBody({ type: ${dtoTitle} })
    @ApiResponse({
      status: 200,
      description: 'Actualiza un registro',
      type: ${dtoTitle},
    })
    @Put()
    async updateRegister(@Body() dto: ${dtoTitle}) {
      return await this.service.updateRegistry(dto);
    }`
      : `@ApiOperation({ summary: 'Actualiza un registro' })
        @ApiBody({ type: ${dtoTitle} })
        @ApiParam({
          name: 'id',
          description: 'Busca por su identificador',
        })
        @ApiResponse({
          status: 200,
          description: 'Actualiza un registro',
          type: ${dtoTitle},
        })
        @Put(':id')
        async updateRegister(@Body() dto: ${dtoTitle}, @Param('id') id: any) {
          return await this.service.updateRegistry(dto, id);
        }`
    }

    ${hasMultiplePKs
      ? `@ApiOperation({ summary: 'Elimina un registro por identificador' })
    @ApiBody({ type: ${searchFieldsDTOTitle} })
    @Delete()
    async deleteRegister(@Body() dto: ${searchFieldsDTOTitle}) {
      return await this.service.deleteRegistry(dto);
    }`
      : `@ApiOperation({ summary: 'Elimina un registro por identificador' })
        @ApiParam({
          name: 'id',
          description: 'Busca por su identificador',
        })
        @Delete(':id')
        async deleteRegister(@Param('id') id: any) {
          return await this.service.deleteRegistry(id);
        }`
    }
      }`;

  if (isMs) {
    document = `import { Controller } from '@nestjs/common';
    import { MessagePattern } from '@nestjs/microservices';
    import { ${serviceTitle} } from './${entityName}.service';
    import { PaginateQuery } from 'nestjs-paginate';
    import { ${dtoTitle} ${hasMultiplePKs ? `, ${searchFieldsDTOTitle}` : ``}} from './dto/${entityName}.dto';

    @Controller('${entityName}')
    export class ${controllerTitle} {
      constructor(private readonly service: ${serviceTitle}) {}

      @MessagePattern({ cmd: 'getAll${normalTitle}' })
      async getAll(query: PaginateQuery) {
        return await this.service.getAll(query);
      }

      @MessagePattern({ cmd: 'getByIds${normalTitle}' })
      async getByIds(${hasMultiplePKs ? "dto: " + searchFieldsDTOTitle : "id: any"}) {
        return await this.service.getByIds(${hasMultiplePKs ? "dto" : "id"});
      }

      @MessagePattern({ cmd: 'createRegistry${normalTitle}' })
      async createRegistry(dto: ${dtoTitle}) {
        return await this.service.createRegistry(dto);
      }

      @MessagePattern({ cmd: 'updateRegistry${normalTitle}' })
      async updateRegistry(dto: ${dtoTitle}) {
        return await this.service.updateRegistry(${hasMultiplePKs ? "dto" : "dto, dto.id"
      });
      }

      @MessagePattern({ cmd: 'deleteRegistry${normalTitle}' })
      async deleteRegistry(${hasMultiplePKs ? "dto: " + searchFieldsDTOTitle : "id: any"
      }) {
        return await this.service.deleteRegistry(${hasMultiplePKs ? "dto" : "id"
      });
      }
    }
    `;
  }

  fs.writeFileSync(
    process.cwd() + `/results/${moduleType}/${entityName}/${entityName}.controller.ts`,
    document,
    err => {
      if (err) {
        console.log('Error writing file', err)
      } else {
        console.log(
          "Created Controller at ",
          `${entityName}/${entityName}.controller.ts`
        );
      }
    }
  );
}

module.exports = generateController;
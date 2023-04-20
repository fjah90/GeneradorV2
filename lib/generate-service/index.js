const fs = require("fs");
const upperCaseEntityName = require("../utls/camel-case-entity");

async function generateService(
  entityName,
  entityColumnsInfo,
  moduleType,
  isMsOnly
) {
  console.log("Generating Service...");
  const isGt = moduleType == "gt" && !isMsOnly;
  const normalTitle = upperCaseEntityName(entityName);
  const dtoTitle = upperCaseEntityName(entityName, "dto");
  const searchFieldsDTOTitle = upperCaseEntityName(entityName, "searchFields");
  const entityTitle = upperCaseEntityName(entityName, "entity");
  const serviceTitle = upperCaseEntityName(entityName, "service");
  const clientTitle = entityName.replaceAll("-", "_").toUpperCase();

  const hasMultiplePKs = entityColumnsInfo.filter((column) => column.isPK).length > 1;

  const singlePK = entityColumnsInfo.filter((column) => column.isPK).length == 1 ? entityColumnsInfo.find((column) => column.isPK) : false;

  const translatedSinglePK = entityColumnsInfo.filter(
    (column) => column.isPK
  )[0].translatedColumn;

  const getMultiplePksObject = JSON.stringify(
    entityColumnsInfo
      .filter((column) => column.isPK)
      .reduce((prev, { translatedColumn }) => {
        const properties = {
          ...prev,
        };
        properties[translatedColumn] = `dto.${translatedColumn}`;
        return properties;
      }, {})
  ).replaceAll('"', "");

  let document = `import { Injectable } from '@nestjs/common';
  import { CRUDMessages } from 'sigebi-lib-common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { HttpStatus } from '@nestjs/common/enums';
  import { PaginateQuery } from 'nestjs-paginate';
  import { CommonFilterService } from 'src/shared/services/common-filter.service';
  import { ${dtoTitle} ${hasMultiplePKs ? `, ${searchFieldsDTOTitle}` : ``}} from './dto/${entityName}.dto';
  import { ${entityTitle} } from './entity/${entityName}.entity';

  @Injectable()
  export class ${serviceTitle} {
    constructor(
      @InjectRepository(${entityTitle})
      private repository: Repository<${entityTitle}>,
      private commonFilterService: CommonFilterService,
    ) {}

    async getAll(query: PaginateQuery) {
      const queryBuilder = this.repository.createQueryBuilder('table');
      return await this.commonFilterService.paginateFilter<${entityTitle}>(
        query,
        this.repository,
        queryBuilder,
        '${translatedSinglePK}',
      );
    }

    ${hasMultiplePKs
      ? `async getByIds(dto: ${searchFieldsDTOTitle}) {
      const value = await this.repository.findOne({ where: dto });
      return value
        ? {
            statusCode: HttpStatus.OK,
            message: [CRUDMessages.GetSuccess],
            data: value,
            count: 1,
          }
        : {
            statusCode: HttpStatus.BAD_REQUEST,
            message: [CRUDMessages.GetNotfound],
            data: [],
            count: 0,
          };
        }`
      : `async getByIds(id: any) {
      const value = await this.repository.findOne({ where: { ${translatedSinglePK}: id } });
      return value
        ? {
            statusCode: HttpStatus.OK,
            message: [CRUDMessages.GetSuccess],
            data: value,
            count: 1,
          }
        : {
            statusCode: HttpStatus.BAD_REQUEST,
            message: [CRUDMessages.GetNotfound],
            data: [],
            count: 0,
          };
        }`
    }

    async createRegistry(dto: ${dtoTitle}) {
      const value = await this.getByIds(${hasMultiplePKs
      ? `${getMultiplePksObject}`
      : `dto.${singlePK.translatedColumn}`
    });
      if (value.count > 0)
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: ['Los ids ya fueron registrados'],
        }

      const creation = await this.repository.save(dto);

      return {
        statusCode: HttpStatus.OK,
        message: [CRUDMessages.CreateSuccess],
        data: creation,
      }
    }

    ${hasMultiplePKs
      ? `async updateRegistry(dto: ${dtoTitle}) {
        try {
          const { affected } = await this.repository.update(${getMultiplePksObject}, dto);
          if (affected == 1) {
            return {
              statusCode: HttpStatus.OK,
              message: [CRUDMessages.UpdateSuccess],
            };
          } else
            return {
              statusCode: HttpStatus.BAD_REQUEST,
              message: ['El registro no existe!'],
            };
        } catch (error) {
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: [error.message],
          };
        }
      }`
      : `async updateRegistry(dto: ${dtoTitle}, id: any) {
        try {
          const { affected } = await this.repository.update({ ${translatedSinglePK}: id }, dto);
          if (affected == 1) {
            return {
              statusCode: HttpStatus.OK,
              message: [CRUDMessages.UpdateSuccess],
            };
          } else
            return {
              statusCode: HttpStatus.BAD_REQUEST,
              message: ['El registro no existe!'],
            };
        } catch (error) {
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: [error.message],
          };
        }
      }`
    }

    ${hasMultiplePKs
      ? `async deleteRegistry(dto: ${searchFieldsDTOTitle}) {
        try {
          const { affected } = await this.repository.delete(dto);
          if (affected == 1) {
            return {
              statusCode: HttpStatus.OK,
              message: [CRUDMessages.DeleteSuccess],
            };
          } else
            return {
              statusCode: HttpStatus.BAD_REQUEST,
              message: ['El registro no existe!'],
            };
        } catch (error) {
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: [error.message],
          };
        }
      }`
      : `async deleteRegistry(id: any) {
      try {
        const { affected } = await this.repository.delete({ ${translatedSinglePK}: id });
        if (affected == 1) {
          return {
            statusCode: HttpStatus.OK,
            message: [CRUDMessages.DeleteSuccess],
          };
        } else
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: ['El registro no existe!'],
          };
      } catch (error) {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: [error.message],
        };
      }
    }`
    }
  }`;

  if (isGt) {
    document = `import { Injectable, Inject } from '@nestjs/common';
    import { ${dtoTitle} ${hasMultiplePKs ? `, ${searchFieldsDTOTitle}` : ``}} from './dto/${entityName}.dto';
    import { ClientProxy } from '@nestjs/microservices';
    import { PaginateQuery } from 'nestjs-paginate';

    @Injectable()
    export class ${serviceTitle} {
        constructor(
            @Inject('${clientTitle}_SERVICE') private readonly client: ClientProxy,
        ) { }

        async getAll(query: PaginateQuery) {
          const pattern = { cmd: 'getAll${normalTitle}' };
          return this.client.send(pattern, query);
        }

        async getByIds(${hasMultiplePKs ? "dto: " + searchFieldsDTOTitle : "id: any"}) {
          const pattern = { cmd: 'getByIds${normalTitle}' };
          return this.client.send(pattern, ${hasMultiplePKs ? "dto" : "id"});
        }

        async createRegistry(dto: ${dtoTitle}) {
          const pattern = { cmd: 'createRegistry${normalTitle}' };
          return this.client.send(pattern, dto);
        }

        async updateRegistry(${hasMultiplePKs ? `dto: ${dtoTitle}` : `dto: ${dtoTitle}, id: any`
      }) {
          const pattern = { cmd: 'updateRegistry${normalTitle}' };
          return this.client.send(pattern, ${hasMultiplePKs ? "dto" : "{ ...dto, id }"
      });
        }

        async deleteRegistry(${hasMultiplePKs ? "dto: " + searchFieldsDTOTitle : "id: any"
      }) {
          const pattern = { cmd: 'deleteRegistry${normalTitle}' };
          return this.client.send(pattern, ${hasMultiplePKs ? "dto" : "id"})
        }
    }`;
  }

  fs.writeFileSync(
    process.cwd() + `/results/${moduleType}/${entityName}/${entityName}.service.ts`,
    document,
    err => {
      if (err) {
        console.log('Error writing file', err)
      } else {
        console.log(
          "Created Service at ",
          ` results/${moduleType}/${entityName}/${entityName}.service.ts`
        );
      }
    }
  );

}

module.exports = generateService;
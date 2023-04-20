const Joi = require("joi");

const entityArraySchema = Joi.array()
  .items(
    Joi.object({
      table: Joi.string().empty().required(),
      entityFileName: Joi.string().empty().required(),
    })
  )
  .min(1)
  .message("Need at least 1 entity to work on");

const bodySchema = Joi.object({
  moduleType: Joi.string().allow("gt", "ms").required(),
  isMsOnly: Joi.bool().required(),
  schema: Joi.string().allow("sera", "sae_nsbdb").required(),
  entities: entityArraySchema,
});
module.exports = { bodySchema, entityArraySchema };

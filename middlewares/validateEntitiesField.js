const { bodySchema } = require("../lib/validator");

module.exports = async function (req, res, next) {
  try {
    const { body } = req;
    if (!body.entities)
      return res.status(400).json({ message: "entities field is required" });

    await bodySchema.validateAsync(body);

    next();
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

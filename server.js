const express = require("express");
const validateEntitiesField = require("./middlewares/validateEntitiesField");
const app = express();
const PORT = 8000;
const generateStructure = require("./run");

app.use(express.json());

app.post("/generate-structure", validateEntitiesField, async (req, res) => {
  try {
    const { body } = req;

    await generateStructure(
      body.entities,
      body.moduleType,
      body.schema,
      body.isMsOnly
    );

    return res
      .status(201)
      .json({ message: `Entities Created in the results folder` });

  } catch (error) {
    return res.status(409).json({ message: error.message });
  }
});

app.listen(PORT, () => console.log("Server listening on PORT:: ", PORT));

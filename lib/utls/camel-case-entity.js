function upperCaseEntityName(entityName, typeOfFile) {
  const names = entityName.includes("-") ? entityName.split("-"): entityName.split("_");
  let finalName = "";
  for (let index = 0; index < names.length; index++) {
    const name = names[index];
    finalName += name.charAt(0).toUpperCase() + name.slice(1);
  }

  if (!typeOfFile) return finalName;

  if (typeOfFile === "service") return finalName + "Service";
  if (typeOfFile === "controller") return finalName + "Controller";
  if (typeOfFile === "entity") return finalName + "Entity";
  if (typeOfFile === "dto") return finalName + "Dto";
  if (typeOfFile === "searchFields") return finalName + "SearchFieldsDto";
  if (typeOfFile === "module") return finalName + "Module";
}

module.exports = upperCaseEntityName;

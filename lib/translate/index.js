require("dotenv").config();
const { Translate } = require("@google-cloud/translate").v2;

const translator = new Translate({
  key: process.env.KEY_TRANSLATE,
});

const checkWord = (word) => {
  const listWordToCheck = {
    "doc": "documento",
    "sol": "solicitud",
    "aclara": "aclaracion",
    "art": "articulo",
    "no": "numero",
    "prog": "programacion",
    "ent": "entrega",
    "const": "constancia",
    "ace": "aceptado",
    "fec": "fecha",
    "1": "one",
    "2": "two",
    "3": "three",
    "4": "four",
    "5": "four",
    "6": "six",
    "7": "seven",
    "8": "eight",
    "9": "nine",
    "0": "zero",
    "est": "este",
    "tot": "total",
    "tiposervicio": "tiposervicio",
    "varcosto": "varcosto",
    "registro": "registro",
    "formato": "formato",
    "cantidad": "cantidad",
  }

  return listWordToCheck[word.toLowerCase()] || word;
};

const checkSpecialWords = (word) => {
  return word === "cve" ? "cve" : false;
};

const translateSpecial = (word) => {
  let listWordToCheck = {
    "fecha": "Date",
    "numero": "Number",
    "cve": "Key",
    "cv": "Key",
    "id": "Id",
    "tipo": "Type",
    "tiposervicio": "typeService",
    "varcosto": "varCost",
    "registro": "register",
    "cantidad": "Quantity",
    "formato": "format",
    "valor": "value"
  }

  return listWordToCheck[word.toLowerCase()] || word;
};

const dateNumberOrId = ["fecha", "numero", "id", "cve", "cv", "tipo", "cantidad"];

async function translateField(column, target) {
  let specialWord;
  let words = column.split("_").filter((word) => {

    if (dateNumberOrId.includes(checkWord(word))) {
      specialWord = checkWord(word);
      return false;
    } else return true;
  });

  let translated = "";

  for (let index = 0; index < words.length; index++) {
    const word = words[index];

    let checkedWord = checkWord(word);
    let w = index > 0 && checkedWord
      ? checkedWord.charAt(0).toUpperCase() + checkedWord.slice(1, checkedWord.length)
      : translateSpecial(checkedWord) ? translateSpecial(checkedWord) : checkedWord;

    let [translations] = await translator.translate(w, {
      from: "es",
      to: target,
    });

    let translatedWord = Array.isArray(translations)
      ? translations[0]
      : translations;

    let isSpecial = checkSpecialWords(checkedWord);

    translated += isSpecial ? isSpecial : translatedWord;
  }
  translated = specialWord ? translated + translateSpecial(specialWord) : translated;

  return translated.replaceAll(/\s/g, "");
}

module.exports = translateField;
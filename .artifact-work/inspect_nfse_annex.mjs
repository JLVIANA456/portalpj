import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("C:/tmp/anexo-b-nfse.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const sheets = await workbook.inspect({
  kind: "sheet",
  include: "id,name",
  maxChars: 4000,
});
console.log(sheets.ndjson);
const matches = await workbook.inspect({
  kind: "match",
  searchTerm: "17.19|Contabilidade|serviços técnicos e auxiliares",
  options: { useRegex: true, maxResults: 50 },
  maxChars: 12000,
});
console.log(matches.ndjson);
const rows = await workbook.inspect({
  kind: "table",
  range: "LISTA.SERV.NAC.!A466:E473",
  include: "values,formulas",
  tableMaxRows: 20,
  tableMaxCols: 8,
  maxChars: 12000,
});
console.log(rows.ndjson);

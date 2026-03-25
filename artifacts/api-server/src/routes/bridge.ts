import { Router, type IRouter } from "express";
import { GenerateBridgeReportBody } from "@workspace/api-zod";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  BorderStyle,
  WidthType,
  AlignmentType,
} from "docx";

const router: IRouter = Router();

router.post("/generate-report", async (req, res) => {
  const parsed = GenerateBridgeReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    vaoLongitudinal,
    larguraTotal,
    numApoios,
    tipoViga,
    tipoLaje,
    nomeObra,
    responsavelTecnico,
  } = parsed.data;

  const now = new Date();
  const dataFormatada = now.toLocaleDateString("pt-BR");

  const tableData: [string, string][] = [
    ["Vão Longitudinal (Y)", `${vaoLongitudinal} m`],
    ["Largura Total (X)", `${larguraTotal} m`],
    ["Número de Apoios", String(numApoios)],
    ["Tipo de Superestrutura", tipoViga],
    ["Sistema da Laje", tipoLaje],
  ];

  const tableRows = tableData.map(([label, value]) =>
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: value })] })],
          width: { size: 50, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1 },
            left: { style: BorderStyle.SINGLE, size: 1 },
            right: { style: BorderStyle.SINGLE, size: 1 },
          },
        }),
      ],
    })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Memória de Cálculo Estrutural - Ponte",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          ...(nomeObra
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Nome da Obra: ", bold: true }),
                    new TextRun({ text: nomeObra }),
                  ],
                }),
              ]
            : []),
          ...(responsavelTecnico
            ? [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Responsável Técnico: ", bold: true }),
                    new TextRun({ text: responsavelTecnico }),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            children: [
              new TextRun({ text: "Data: ", bold: true }),
              new TextRun({ text: dataFormatada }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "1. Geometria e Definições",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({ text: "" }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "2. Normas de Referência",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• NBR 7188:2013 - Carga móvel rodoviária e de pedestres em pontes, viadutos, passarelas e outras estruturas" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• NBR 6118:2014 - Projeto de estruturas de concreto - Procedimento" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• NBR 7187:2003 - Projeto de pontes de concreto armado e protendido - Procedimento" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "3. Materiais",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Concreto: ", bold: true }),
              new TextRun({ text: "fck = 30 MPa (C30)" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Aço: ", bold: true }),
              new TextRun({ text: "CA-50 (fyk = 500 MPa)" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "4. Ações Consideradas",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Peso próprio da estrutura (PP)" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Supercarga permanente (revestimentos, guarda-corpo)" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "• Carga móvel - Trem-Tipo TB-450 conforme NBR 7188:2013" }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "5. Observações",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Esta memória de cálculo foi gerada automaticamente pelo BridgeDesign Pro. Os valores apresentados são parâmetros iniciais de dimensionamento. O projeto executivo deverá ser elaborado por profissional habilitado, em conformidade com as normas técnicas vigentes.",
                italics: true,
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="Memoria_Calculo_Ponte.docx"'
  );
  res.send(buffer);
});

export default router;

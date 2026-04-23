import { OutputTypes } from "../../../common/DevelopCellRenderer/CellRenderers/cellRendererHelper";

export const chartColors = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#00FFFF",
  "#FF00FF",
  "#C0C0C0",
  "#800000",
  "#808000",
  "#008000",
  "#800080",
  "#008080",
  "#000080",
  "#CD5C5C",
  "#C71585",
  "#4B0082",
  "#00FA9A",
  "#FF6347",
  "#008080",
  "#FFA500",
  "#AA82EE",
  "#7CFC00",
  "#20B2AA",
];
export const getSuffixForCharts = (header, considerIndex = null) => {
  //this is a temporary implementation
  let newHeader = header;
  if (considerIndex || Array.isArray(header)) {
    newHeader = {
      ...header?.[considerIndex || 0],
      isNumericEval:
        header?.[considerIndex || 0]?.outputType === OutputTypes.NUMERIC,
    };
  }

  if (newHeader?.isNumericEvalPercentage) {
    return "%";
  } else if (newHeader?.isNumericEval) {
    return "";
  } else {
    return "%";
  }
};

// src/tabs/components/sales/exportPdf.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportNodeToPdf({
  node,
  filename = "sales-report.pdf",
  title = "Sales Report",
}) {
  if (!node) throw new Error("Missing node to export");

  // Ensure fonts/images are painted
  await new Promise((r) => requestAnimationFrame(r));

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Title
  pdf.setFontSize(14);
  pdf.text(title, 12, 12);

  // Image area
  const margin = 10;
  const startY = 16;
  const usableWidth = pageWidth - margin * 2;

  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = usableWidth;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  let y = startY;
  let remainingHeight = imgHeight;
  let position = 0;

  // First page image
  pdf.addImage(imgData, "PNG", margin, y, imgWidth, imgHeight);
  remainingHeight -= pageHeight - y - margin;

  // Additional pages if needed
  while (remainingHeight > 0) {
    pdf.addPage();
    position += pageHeight - margin * 2;
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      margin - position,
      imgWidth,
      imgHeight,
    );
    remainingHeight -= pageHeight - margin * 2;
  }

  pdf.save(filename);
}

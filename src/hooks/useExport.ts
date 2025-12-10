import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ExportColumn {
  header: string;
  key: string;
}

interface ExportData {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  data: Record<string, unknown>[];
  filename: string;
}

export const useExport = () => {
  const exportToPDF = ({ title, subtitle, columns, data, filename }: ExportData) => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(20, 184, 166); // Teal accent
      doc.text(title, 14, 22);
      
      if (subtitle) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(subtitle, 14, 30);
      }
      
      // Date
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, 14, subtitle ? 38 : 30);
      
      // Table
      const tableData = data.map(row => 
        columns.map(col => {
          const value = row[col.key];
          return value !== null && value !== undefined ? String(value) : "-";
        })
      );
      
      autoTable(doc, {
        head: [columns.map(col => col.header)],
        body: tableData,
        startY: subtitle ? 45 : 37,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [20, 184, 166],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      });
      
      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Página ${i} de ${pageCount} | Squad Performance Hub`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }
      
      doc.save(`${filename}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  const exportToExcel = ({ title, columns, data, filename }: ExportData) => {
    try {
      // Prepare data with headers
      const worksheetData = data.map(row => {
        const newRow: Record<string, unknown> = {};
        columns.forEach(col => {
          newRow[col.header] = row[col.key] ?? "-";
        });
        return newRow;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Set column widths
      const colWidths = columns.map(col => ({
        wch: Math.max(col.header.length, 15)
      }));
      worksheet["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, title.substring(0, 31));

      // Generate file
      XLSX.writeFile(workbook, `${filename}.xlsx`);
      toast.success("Excel exportado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar Excel");
    }
  };

  return { exportToPDF, exportToExcel };
};

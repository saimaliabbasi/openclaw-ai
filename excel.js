/* ═══════════════════════════════════════════
   OpenClaw — Excel Export Tool (SheetJS)
   ═══════════════════════════════════════════ */

const XLSX = require('xlsx');

function generateExcel(leads) {
  if (!leads || leads.length === 0) {
    throw new Error("No data to export");
  }

  // 1. Convert JSON array to worksheet
  const worksheet = XLSX.utils.json_to_sheet(leads, {
    header: ["name", "email", "phone", "website", "address"]
  });

  // 2. Adjust column widths
  worksheet['!cols'] = [
    { wch: 30 }, // name
    { wch: 25 }, // email
    { wch: 15 }, // phone
    { wch: 30 }, // website
    { wch: 40 }  // address
  ];

  // 3. Create workbook and append sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

  // 4. Generate buffer (works in Node.js)
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  return buffer;
}

module.exports = { generateExcel };

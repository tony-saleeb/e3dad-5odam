import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

// POST: Receive bookings data from the client and generate Excel
export async function POST(request: NextRequest) {
  try {
    const { bookings } = await request.json();

    if (!bookings || !Array.isArray(bookings)) {
      return NextResponse.json({ error: 'No bookings data provided' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    // Define Columns
    worksheet.columns = [
      { header: 'اسم الكنيسة', key: 'churchName', width: 25 },
      { header: 'عنوان المشروع', key: 'title', width: 25 },
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'الفترة', key: 'period', width: 20 },
      { header: 'المشاركون', key: 'teammates', width: 40 },
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' }, // Emerald-600
      };
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
        name: 'Segoe UI',
        size: 11,
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate Data Rows
    bookings.forEach((b: any) => {
      worksheet.addRow({
        churchName: b.churchName || '',
        title: b.title || '',
        date: b.date || '',
        period: `${b.startTime || ''} - ${b.endTime || ''}`,
        teammates: Array.isArray(b.teammates) ? b.teammates.join(' | ') : '',
      });
    });

    // Alignment for all content rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        });
      }
    });

    // Generate Buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=church_bookings.xlsx',
      },
    });
  } catch (err: any) {
    console.error('Error generating Excel export:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

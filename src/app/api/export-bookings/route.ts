import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

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
    if (bookings && bookings.length > 0) {
      bookings.forEach((b) => {
        worksheet.addRow({
          churchName: b.churchName || '',
          title: b.title || '',
          date: b.date || '',
          period: `${b.startTime} - ${b.endTime}`,
          teammates: Array.isArray(b.teammates) ? b.teammates.join(' | ') : '',
        });
      });
    }

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

    // Fix UTF-8 encoding assignments
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

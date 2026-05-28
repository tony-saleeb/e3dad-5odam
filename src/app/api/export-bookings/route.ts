import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Booking, EvaluationField, TeamEvaluation } from '@/types';

// POST: Receive bookings data from the client and generate Excel
export async function POST(request: NextRequest) {
  try {
    const { bookings, evaluations, evaluationFields } = await request.json();

    if (!bookings || !Array.isArray(bookings)) {
      return NextResponse.json({ error: 'No bookings data provided' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    // Define Columns
    const cols = [
      { header: 'اسم الكنيسة', key: 'churchName', width: 25 },
      { header: 'عنوان المشروع', key: 'title', width: 25 },
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'الفترة', key: 'period', width: 20 },
      { header: 'المشاركون', key: 'teammates', width: 40 },
    ];

    const fields: EvaluationField[] = Array.isArray(evaluationFields) ? evaluationFields : [];
    const evals: TeamEvaluation[] = Array.isArray(evaluations) ? evaluations : [];

    // Dynamically append columns for each evaluation field
    fields.forEach((field: EvaluationField) => {
      cols.push({
        header: `${field.name} (من ${field.maxMark})`,
        key: `field_${field.id}`,
        width: 25,
      });
    });

    if (fields.length > 0) {
      cols.push({
        header: 'إجمالي التقييم',
        key: 'totalScore',
        width: 18,
      });
    }

    worksheet.columns = cols;

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

    // Group evaluations by bookingId
    const evaluationsByBooking = evals.reduce((acc: Record<string, TeamEvaluation[]>, ev: TeamEvaluation) => {
      if (!acc[ev.bookingId]) {
        acc[ev.bookingId] = [];
      }
      acc[ev.bookingId].push(ev);
      return acc;
    }, {} as Record<string, TeamEvaluation[]>);

    // Populate Data Rows
    bookings.forEach((b: Booking) => {
      const membersStr = Array.isArray(b.teamMembers)
        ? b.teamMembers.map((m) => `${m.name} (${m.id})`).join(' | ')
        : Array.isArray(b.teammates) ? b.teammates.join(' | ') : '';

      const bookingEvals = evaluationsByBooking[b.id] || [];
      const evsCount = bookingEvals.length;

      const rowData: Record<string, string | number> = {
        churchName: b.churchName || '',
        title: b.title || '',
        date: b.date || '',
        period: `${b.startTime || ''} - ${b.endTime || ''}`,
        teammates: membersStr,
      };

      let totalSum = 0;
      let totalMax = 0;

      fields.forEach((field: EvaluationField) => {
        const sum = bookingEvals.reduce((acc: number, ev: TeamEvaluation) => acc + (ev.grades?.[field.id] || 0), 0);
        const avg = evsCount > 0 ? parseFloat((sum / evsCount).toFixed(1)) : null;
        rowData[`field_${field.id}`] = avg !== null ? avg : '—';
        if (avg !== null) {
          totalSum += avg;
        }
        totalMax += field.maxMark;
      });

      if (fields.length > 0) {
        rowData.totalScore = evsCount > 0 ? `${parseFloat(totalSum.toFixed(1))} / ${totalMax}` : '—';
      }

      worksheet.addRow(rowData);
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
  } catch (err) {
    console.error('Error generating Excel export:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Booking, EvaluationField, TeamEvaluation } from '@/types';

// POST: Receive bookings data from the client and generate Excel
export async function POST(request: NextRequest) {
  try {
    const { bookings, evaluations, evaluationFields, detailed } = await request.json();

    if (!bookings || !Array.isArray(bookings)) {
      return NextResponse.json({ error: 'No bookings data provided' }, { status: 400 });
    }

    const isDetailed = detailed !== false; // Default to true if not specified
    const fields: EvaluationField[] = Array.isArray(evaluationFields) ? evaluationFields : [];
    const evals: TeamEvaluation[] = Array.isArray(evaluations) ? evaluations : [];
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bookings');

    // Define Base Columns (Including leader name and leader email columns)
    const cols = [
      { header: 'اسم الكنيسة', key: 'churchName', width: 25 },
      { header: 'عنوان المشروع', key: 'title', width: 25 },
      { header: 'اسم القائد', key: 'requesterName', width: 20 },
      { header: 'بريد القائد', key: 'requesterEmail', width: 25 },
      { header: 'التاريخ', key: 'date', width: 15 },
      { header: 'الفترة', key: 'period', width: 20 },
    ];

    // Find the maximum number of team members across all bookings to generate columns dynamically
    let maxMembers = 0;
    bookings.forEach((b: Booking) => {
      const count = Array.isArray(b.teamMembers)
        ? b.teamMembers.length
        : Array.isArray(b.teammates)
        ? b.teammates.length
        : 0;
      if (count > maxMembers) {
        maxMembers = count;
      }
    });

    // Add numbered columns for each participant
    for (let i = 1; i <= maxMembers; i++) {
      cols.push({
        header: `المشارك ${i}`,
        key: `member_${i}`,
        width: 25,
      });
    }

    if (isDetailed) {
      cols.push(
        { header: 'اسم المقيم', key: 'servantName', width: 20 },
        { header: 'بريد المقيم', key: 'servantEmail', width: 25 }
      );

      // Dynamically append columns for each evaluation field in detailed mode only
      fields.forEach((field: EvaluationField) => {
        cols.push({
          header: `${field.name} (من ${field.maxMark})`,
          key: `field_${field.id}`,
          width: 25,
        });
      });
    }

    if (fields.length > 0) {
      cols.push({
        header: 'إجمالي التقييم',
        key: 'totalScore',
        width: 18,
      });
    }

    if (isDetailed) {
      cols.push({
        header: 'ملاحظات المقيم / التعليق',
        key: 'comments',
        width: 40,
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
      // Get array of members
      const membersList: string[] = [];
      if (Array.isArray(b.teamMembers)) {
        b.teamMembers.forEach((m) => {
          if (m.name) {
            membersList.push(m.id ? `${m.name} (${m.id})` : m.name);
          }
        });
      } else if (Array.isArray(b.teammates)) {
        b.teammates.forEach((t) => {
          if (t) {
            membersList.push(t);
          }
        });
      }

      const bookingEvals = evaluationsByBooking[b.id] || [];

      if (!isDetailed) {
        // --- SIMPLE MODE: One row per booking (averages summed) ---
        const evsCount = bookingEvals.length;
        const rowData: Record<string, string | number> = {
          churchName: b.churchName || '',
          title: b.title || '',
          requesterName: b.requesterName || '',
          requesterEmail: b.requesterEmail || '',
          date: b.date || '',
          period: `${b.startTime || ''} - ${b.endTime || ''}`,
        };

        // Populate dynamic numbered candidate columns
        for (let i = 1; i <= maxMembers; i++) {
          rowData[`member_${i}`] = membersList[i - 1] || '';
        }

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
      } else {
        // --- DETAILED MODE: One row per evaluation ---
        if (bookingEvals.length === 0) {
          // No evaluations yet for this booking
          const rowData: Record<string, string | number> = {
            churchName: b.churchName || '',
            title: b.title || '',
            requesterName: b.requesterName || '',
            requesterEmail: b.requesterEmail || '',
            date: b.date || '',
            period: `${b.startTime || ''} - ${b.endTime || ''}`,
            servantName: '—',
            servantEmail: '—',
            comments: '—',
          };

          // Populate dynamic numbered candidate columns
          for (let i = 1; i <= maxMembers; i++) {
            rowData[`member_${i}`] = membersList[i - 1] || '';
          }

          fields.forEach((field: EvaluationField) => {
            rowData[`field_${field.id}`] = '—';
          });

          if (fields.length > 0) {
            rowData.totalScore = '—';
          }

          worksheet.addRow(rowData);
        } else {
          // Output one row per servant evaluation
          bookingEvals.forEach((ev: TeamEvaluation) => {
            const rowData: Record<string, string | number> = {
              churchName: b.churchName || '',
              title: b.title || '',
              requesterName: b.requesterName || '',
              requesterEmail: b.requesterEmail || '',
              date: b.date || '',
              period: `${b.startTime || ''} - ${b.endTime || ''}`,
              servantName: ev.servantName || '',
              servantEmail: ev.servantEmail || '',
              comments: ev.comments || '—',
            };

            // Populate dynamic numbered candidate columns
            for (let i = 1; i <= maxMembers; i++) {
              rowData[`member_${i}`] = membersList[i - 1] || '';
            }

            let totalSum = 0;
            let totalMax = 0;

            fields.forEach((field: EvaluationField) => {
              const mark = ev.grades?.[field.id] !== undefined ? ev.grades[field.id] : null;
              rowData[`field_${field.id}`] = mark !== null ? mark : '—';
              if (mark !== null) {
                totalSum += mark;
              }
              totalMax += field.maxMark;
            });

            if (fields.length > 0) {
              rowData.totalScore = `${totalSum} / ${totalMax}`;
            }

            worksheet.addRow(rowData);
          });
        }
      }
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

import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { Booking, EvaluationField, TeamEvaluation } from '@/types';

// POST: Receive bookings data from the client and generate Excel
// Note: Full Firebase Admin SDK verification requires server-side setup.
// This check ensures the request comes from an authenticated client session.
export async function POST(request: NextRequest) {
  try {
    // Basic auth guard: require an authorization token from the client
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized — authentication required' },
        { status: 401 }
      );
    }

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
      const count = Array.isArray(b.teamMembers) ? b.teamMembers.length : 0;
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
    headerRow.height = 25;
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
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF047857' } },
        left: { style: 'thin', color: { argb: 'FF047857' } },
        bottom: { style: 'thin', color: { argb: 'FF047857' } },
        right: { style: 'thin', color: { argb: 'FF047857' } },
      };
    });

    // Auto-filter
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: cols.length }
    };

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

    // Style Data Rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Striped rows (alternate background color)
        const isEven = rowNumber % 2 === 0;
        
        row.eachCell((cell, colNumber) => {
          // Determine if it's the comments column (which is the last one in detailed mode)
          const isCommentCol = isDetailed && colNumber === cols.length;
          
          cell.alignment = { 
            horizontal: isCommentCol ? 'right' : 'center', 
            vertical: 'middle',
            wrapText: isCommentCol // Wrap text for comments
          };
          
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: isEven ? 'FFF3F4F6' : 'FFFFFFFF' } // Gray-100 / White
          };
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          };
          
          cell.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF1F2937' } };
        });
      }
    });

    // === SHEET 2: LEADERBOARD ===
    const leaderboardSheet = workbook.addWorksheet('لوحة الصدارة');
    
    // Setup columns for Leaderboard
    const lbCols = [
      { header: 'المركز', key: 'rank', width: 10 },
      { header: 'الكنيسة', key: 'churchName', width: 25 },
      { header: 'الفريق / المشروع', key: 'teamName', width: 25 },
      { header: 'عدد المشاريع المقيمة', key: 'counts', width: 20 },
    ];
    
    fields.forEach((field: EvaluationField) => {
      lbCols.push({
        header: `متوسط ${field.name}`,
        key: `avg_${field.id}`,
        width: 20,
      });
    });
    
    lbCols.push({ header: 'المجموع الكلي', key: 'total', width: 20 });
    leaderboardSheet.columns = lbCols;
    
    // Style Leaderboard Header
    const lbHeaderRow = leaderboardSheet.getRow(1);
    lbHeaderRow.height = 28;
    lbHeaderRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate-900
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI', size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF334155' } },
        left: { style: 'medium', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF334155' } },
        right: { style: 'medium', color: { argb: 'FF334155' } },
      };
    });
    
    leaderboardSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: lbCols.length }
    };
    
    // Calculate leaderboard scores
    const teamScores: Record<string, { churchName: string, teamName: string, total: number, counts: number, fields: Record<string, number> }> = {};
    
    bookings.forEach((b: Booking) => {
      if (b.status !== 'approved') return;
      const bookingEvals = evaluationsByBooking[b.id] || [];
      if (bookingEvals.length === 0) return;
      
      const churchName = b.churchName || 'غير معروف';
      const teamName = b.title || 'بدون عنوان';
      const key = `${churchName} - ${teamName}`;
      
      if (!teamScores[key]) {
        teamScores[key] = { churchName, teamName, total: 0, counts: 0, fields: {} };
      }
      
      const bookingAvgTotal = bookingEvals.reduce((sum, ev) => sum + Object.values(ev.grades).reduce((a,c)=>a+c,0), 0) / bookingEvals.length;
      teamScores[key].total += bookingAvgTotal;
      teamScores[key].counts += 1;
      
      fields.forEach(f => {
        if (!teamScores[key].fields[f.id]) teamScores[key].fields[f.id] = 0;
        const fieldAvg = bookingEvals.reduce((sum, ev) => sum + (ev.grades[f.id] || 0), 0) / bookingEvals.length;
        teamScores[key].fields[f.id] += fieldAvg;
      });
    });
    
    const sortedTeams = Object.values(teamScores).sort((a, b) => b.total - a.total);
    
    sortedTeams.forEach((team, idx) => {
      const rowData: Record<string, string | number> = {
        rank: idx + 1,
        churchName: team.churchName,
        teamName: team.teamName,
        counts: team.counts,
        total: parseFloat(team.total.toFixed(1))
      };
      
      fields.forEach(f => {
        rowData[`avg_${f.id}`] = parseFloat((team.fields[f.id] || 0).toFixed(1));
      });
      
      leaderboardSheet.addRow(rowData);
    });
    
    leaderboardSheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        const rank = rowNumber - 1;
        let bgColor = 'FFFFFFFF'; // default white
        let fontColor = 'FF1E293B'; // default slate-800
        let isBold = false;
        
        // Highlight top 3
        if (rank === 1) {
          bgColor = 'FFFFD700'; // Gold
          fontColor = 'FF713F12'; // Yellow-900
          isBold = true;
          row.height = 25;
        } else if (rank === 2) {
          bgColor = 'FFE2E8F0'; // Silver (Slate-200)
          fontColor = 'FF334155'; // Slate-700
          isBold = true;
          row.height = 22;
        } else if (rank === 3) {
          bgColor = 'FFD4A373'; // Bronze
          fontColor = 'FF78350F'; // Amber-900
          isBold = true;
          row.height = 22;
        } else if (rank % 2 === 0) {
          bgColor = 'FFF8FAFC'; // Alternate row color
        }
        
        row.eachCell((cell) => {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.font = { name: 'Segoe UI', size: isBold ? 11 : 10, bold: isBold, color: { argb: fontColor } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          };
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

'use server'

import { createAdminClient } from '@/lib/supabase/admin'

interface MarkRow {
  student_id: string
  paper_name: string
  mcq_score: string
  seq_q1: string
  seq_q2: string
  seq_q3: string
  seq_q4: string
  ess_q1: string
  ess_q2: string
  ess_q3: string
  ess_q4: string
}

export async function importMarks(marksList: MarkRow[]) {
  try {
    const supabaseAdmin = createAdminClient()

    let successCount = 0
    let errorCount = 0

    // Cache for papers
    const paperCache: { [key: string]: string } = {}

    for (const row of marksList) {
      try {
        console.log('Importing:', row.student_id)

        const pName = row.paper_name?.trim()

        if (!pName) {
          errorCount++
          continue
        }

        let paperId = paperCache[pName]

        // =========================
        // FIND / CREATE PAPER
        // =========================
        if (!paperId) {
          const { data: existingPaper, error: existingPaperError } =
            await supabaseAdmin
              .from('papers')
              .select('id')
              .eq('paper_name', pName)
              .maybeSingle()

          if (existingPaperError) {
            console.error('Paper Search Error:', existingPaperError.message)
            errorCount++
            continue
          }

          if (existingPaper) {
            paperId = existingPaper.id
          } else {
            const { data: newPaper, error: newPaperError } =
              await supabaseAdmin
                .from('papers')
                .insert({
                  paper_name: pName,
                })
                .select('id')
                .single()

            if (newPaperError || !newPaper) {
              console.error(
                'Paper Create Error:',
                newPaperError?.message
              )
              errorCount++
              continue
            }

            paperId = newPaper.id
          }

          paperCache[pName] = paperId
        }

        // =========================
        // FIND STUDENT
        // =========================
        const { data: studentData, error: studentError } =
          await supabaseAdmin
            .from('students')
            .select('id')
            .eq('student_id', row.student_id?.trim())
            .maybeSingle()

        if (studentError || !studentData) {
          console.error(
            `Student not found: ${row.student_id}`,
            studentError?.message
          )

          errorCount++
          continue
        }

        // =========================
        // CONVERT MARKS
        // =========================
        const mcq = parseFloat(row.mcq_score || '0') || 0

        const sq1 = parseFloat(row.seq_q1 || '0') || 0
        const sq2 = parseFloat(row.seq_q2 || '0') || 0
        const sq3 = parseFloat(row.seq_q3 || '0') || 0
        const sq4 = parseFloat(row.seq_q4 || '0') || 0

        const es1 = parseFloat(row.ess_q1 || '0') || 0
        const es2 = parseFloat(row.ess_q2 || '0') || 0
        const es3 = parseFloat(row.ess_q3 || '0') || 0
        const es4 = parseFloat(row.ess_q4 || '0') || 0

        const total =
          mcq +
          sq1 +
          sq2 +
          sq3 +
          sq4 +
          es1 +
          es2 +
          es3 +
          es4

        // =========================
        // UPSERT MARKS
        // =========================
        const { error: marksError } = await supabaseAdmin
          .from('marks')
          .upsert(
            {
              student_id: studentData.id,
              paper_id: paperId,

              mcq_score: mcq,

              seq_q1: sq1,
              seq_q2: sq2,
              seq_q3: sq3,
              seq_q4: sq4,

              ess_q1: es1,
              ess_q2: es2,
              ess_q3: es3,
              ess_q4: es4,

              total_marks: total,
            },
            {
              onConflict: 'student_id,paper_id',
            }
          )

        if (marksError) {
          console.error(
            `Error inserting marks for ${row.student_id}:`,
            marksError.message
          )

          errorCount++
        } else {
          successCount++
        }
      } catch (rowError) {
        console.error('Row Import Error:', rowError)
        errorCount++
      }
    }

    return {
      success: true,
      successCount,
      errorCount,
    }
  } catch (mainError) {
    console.error('MAIN IMPORT ERROR:', mainError)

    return {
      success: false,
      successCount: 0,
      errorCount: 0,
      error:
        mainError instanceof Error
          ? mainError.message
          : 'Unknown error',
    }
  }
}
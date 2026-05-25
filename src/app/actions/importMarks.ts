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
  const supabaseAdmin = createAdminClient()
  
  let successCount = 0
  let errorCount = 0

  // පේපර්ස් මැප් කරගන්න Cache එකක් (හැම පේළියටම DB Query ගහන එක ඉතිරි කරගන්න)
  const paperCache: { [key: string]: string } = {}

  for (const row of marksList) {
    try {
      const pName = row.paper_name.trim()
      let paperId = paperCache[pName]

      // 1. පේපර් එක Cache එකේ නැත්නම් DB එකෙන් බලනවා/හදනවා
      if (!paperId) {
        // පේපර් එක දැනටමත් තියෙනවද බලනවා
        const { data: existingPaper } = await supabaseAdmin
          .from('papers')
          .select('id')
          .eq('paper_name', pName)
          .single()

        if (existingPaper) {
          paperId = existingPaper.id
        } else {
          // නැත්නම් අලුත් පේපර් එකක් ක්‍රියේට් කරනවා
          const { data: newPaper, error: pError } = await supabaseAdmin
            .from('papers')
            .insert({ paper_name: pName })
            .select('id')
            .single()
            
          if (pError || !newPaper) continue
          paperId = newPaper.id
        }
        paperCache[pName] = paperId
      }

      // 2. Student ID එකෙන් UUID එක ගන්නවා
      const { data: studentData, error: sError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('student_id', row.student_id.trim())
        .single()

      if (sError || !studentData) {
        console.error(`Student not found: ${row.student_id}`)
        errorCount++
        continue
      }

      // 3. ලකුණු ටික Number බවට හරවා ගන්නවා
      const mcq = parseInt(row.mcq_score) || 0
      const sq1 = parseFloat(row.seq_q1) || 0
      const sq2 = parseFloat(row.seq_q2) || 0
      const sq3 = parseFloat(row.seq_q3) || 0
      const sq4 = parseFloat(row.seq_q4) || 0
      const es1 = parseFloat(row.ess_q1) || 0
      const es2 = parseFloat(row.ess_q2) || 0
      const es3 = parseFloat(row.ess_q3) || 0
      const es4 = parseFloat(row.ess_q4) || 0

      // මුළු ලකුණු එකතුව (Total Marks) ගණනය කිරීම
      const total = mcq + sq1 + sq2 + sq3 + sq4 + es1 + es2 + es3 + es4

      // 4. ලකුණු ටික 'marks' ටේබල් එකට දානවා (Upsert කරනවා - තිබ්බොත් Update වෙන්න)
      const { error: mError } = await supabaseAdmin
        .from('marks')
        .upsert({
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
          total_marks: total
        }, { onConflict: 'student_id,paper_id' }) // එකම පේපර් එකට ඩබල් රෝ වැටීම වලක්වයි

      if (mError) {
        console.error(`Error inserting marks for ${row.student_id}:`, mError.message)
        errorCount++
      } else {
        successCount++
      }

    } catch (err) {
      errorCount++
    }
  }

  return { success: true, successCount, errorCount }
}